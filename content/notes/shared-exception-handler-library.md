---
title: "Spring Boot Shared Exception Handler for Microservices"
description: "How to package global exception handling as a Spring Boot starter for a microservice fleet — RFC 7807 responses, no leaked stack traces, one dependency."
date: "2026-05-09"
tags: ["java", "spring-boot", "spring-boot-starter", "microservices", "exception-handling", "rest-controller-advice", "rfc-7807", "architecture"]
---

Walk through any microservice fleet that's been running for a few years and you'll find the same pattern, written badly in slightly different ways across thirty repositories: try/catch ladders inside controllers, hand-rolled error response DTOs, inconsistent HTTP status codes, and — at least once per fleet — an endpoint that returns a full Java stack trace in a 500 response because someone forgot to wire the global handler.

This post lays out the approach for packaging exception handling as a shared library that microservices consume by adding one dependency. Service code becomes free of try/catch noise. Error responses become consistent across the fleet. Stack traces never reach the wire.

## What "good" looks like on both sides

On the **service side**, exception handling should be invisible. Controllers throw domain exceptions and stop worrying. No try/catch, no `ResponseEntity.status(404).body(...)`, no manual error-DTO construction.

```java
@GetMapping("/customers/{id}")
public CustomerResponse getCustomer(@PathVariable String id) {
    return customerService.findById(id)
        .orElseThrow(() -> new NotFoundException("CUSTOMER_NOT_FOUND", "Customer not found"));
}
```

That's the whole controller. The shared library handles the rest.

On the **wire side**, error responses should be uniform across the fleet, machine-parseable, and safe — never leaking internal types, SQL fragments, or stack traces. RFC 7807 Problem Details is the standard:

```json
{
  "type": "https://errors.acme.com/customer-not-found",
  "title": "Customer not found",
  "status": 404,
  "detail": "No customer exists with id 'cus_abc123'",
  "instance": "/customers/cus_abc123",
  "code": "CUSTOMER_NOT_FOUND",
  "correlationId": "5f7a-...",
  "timestamp": "2026-05-09T10:14:32Z"
}
```

That shape contains everything a client needs to handle the error programmatically and everything an operator needs to find the problem in logs (the `correlationId`). It contains nothing the caller could use to fingerprint the runtime, the database, or the framework.

## The library shape

Package the handler as a Spring Boot starter — a small JAR with auto-configuration that activates when consumers add it as a dependency. The directory layout:

```
platform-exception-handler/
├── src/main/java/com/acme/platform/exceptions/
│   ├── DomainException.java
│   ├── NotFoundException.java
│   ├── ValidationException.java
│   ├── ConflictException.java
│   ├── UnauthorizedException.java
│   ├── ForbiddenException.java
│   ├── GlobalExceptionHandler.java
│   ├── ProblemDetailFactory.java
│   └── autoconfig/
│       └── ExceptionHandlerAutoConfiguration.java
└── src/main/resources/META-INF/spring/
    └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

The `AutoConfiguration.imports` file is what makes this self-installing. One line:

```
com.acme.platform.exceptions.autoconfig.ExceptionHandlerAutoConfiguration
```

Spring Boot picks that up at startup, registers the global handler, and the consuming service is now wired without a single line of configuration on its side.

## The exception hierarchy

Define a sealed hierarchy of domain exceptions. Service code throws these; nothing else.

```java
public abstract class DomainException extends RuntimeException {
    private final String code;

    protected DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() { return code; }
    public abstract HttpStatus status();
}

public class NotFoundException extends DomainException {
    public NotFoundException(String code, String message) { super(code, message); }
    public HttpStatus status() { return HttpStatus.NOT_FOUND; }
}

public class ValidationException extends DomainException {
    public ValidationException(String code, String message) { super(code, message); }
    public HttpStatus status() { return HttpStatus.BAD_REQUEST; }
}

public class ConflictException extends DomainException { /* 409 */ }
public class UnauthorizedException extends DomainException { /* 401 */ }
public class ForbiddenException extends DomainException { /* 403 */ }
```

Five exception types cover roughly 95% of what services actually throw. Resist the urge to add a sixth until a real case shows up — the value of the hierarchy is partly in its smallness.

The `code` field is what makes this hierarchy useful to clients. `CUSTOMER_NOT_FOUND` is a stable contract that survives a refactor of the message text. Clients switch on it; humans read the message.

## The global handler

A single `@RestControllerAdvice` catches everything and produces ProblemDetails:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DomainException.class)
    public ProblemDetail handleDomain(DomainException ex, HttpServletRequest req) {
        var correlationId = req.getHeader("X-Correlation-Id");
        log.info("Domain exception code={} status={} correlationId={} path={}",
                 ex.code(), ex.status().value(), correlationId, req.getRequestURI());
        return ProblemDetailFactory.from(ex, req, correlationId);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleBeanValidation(MethodArgumentNotValidException ex,
                                              HttpServletRequest req) {
        var fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> Map.of("field", fe.getField(), "message", fe.getDefaultMessage()))
            .toList();
        var correlationId = req.getHeader("X-Correlation-Id");
        log.info("Validation failed correlationId={} path={}", correlationId, req.getRequestURI());
        return ProblemDetailFactory.validation(fieldErrors, req, correlationId);
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnknown(Exception ex, HttpServletRequest req) {
        var correlationId = req.getHeader("X-Correlation-Id");
        log.error("Unhandled exception correlationId={} path={}",
                  correlationId, req.getRequestURI(), ex);
        return ProblemDetailFactory.internal(req, correlationId);
    }
}
```

Three handlers cover the spectrum: domain exceptions (the expected ones), framework validation exceptions (the structured ones), and the catch-all (everything else). Add specific handlers for `ConstraintViolationException`, `DataIntegrityViolationException`, `AccessDeniedException`, and `HttpMessageNotReadableException` as the fleet's traffic teaches you to.

## What to expose, what to hide

This is the core discipline of the library, and the reason it's worth centralizing in one place.

**Expose:**

- The HTTP status (intrinsic to the response).
- A stable error `code` that the client can switch on.
- A safe, human-readable `title` and `detail` — written by the developer who threw the exception, not auto-derived from the exception class.
- The `instance` path (which URL produced the error).
- A `correlationId` so the operator can find the request in logs.
- A `timestamp` for client-side log correlation.

**Hide, always:**

- The exception's class name (`NullPointerException`, `SQLIntegrityConstraintViolationException` — these fingerprint your stack).
- The stack trace.
- The cause chain.
- Internal state — DB column names, SQL fragments, file paths, library versions.
- The runtime — JVM version, Spring version, server name.

For domain exceptions, the message is whatever the throwing code wrote and is therefore safe by construction. For unknown exceptions, the message is hardcoded: *"Something went wrong. Reference: {correlationId}"*. Never the exception's `getMessage()`.

```java
public final class ProblemDetailFactory {

    public static ProblemDetail from(DomainException ex,
                                     HttpServletRequest req,
                                     String correlationId) {
        var pd = ProblemDetail.forStatusAndDetail(ex.status(), ex.getMessage());
        pd.setTitle(ex.status().getReasonPhrase());
        pd.setInstance(URI.create(req.getRequestURI()));
        pd.setProperty("code", ex.code());
        pd.setProperty("correlationId", correlationId);
        pd.setProperty("timestamp", Instant.now().toString());
        return pd;
    }

    public static ProblemDetail internal(HttpServletRequest req, String correlationId) {
        var pd = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Something went wrong. Reference: " + correlationId);
        pd.setTitle("Internal Server Error");
        pd.setInstance(URI.create(req.getRequestURI()));
        pd.setProperty("code", "INTERNAL_ERROR");
        pd.setProperty("correlationId", correlationId);
        pd.setProperty("timestamp", Instant.now().toString());
        return pd;
    }
}
```

The asymmetry is deliberate. Internal errors give the client almost nothing. The operator gets everything they need, in logs, against the same correlation ID.

## Logging strategy

The handler logs every exception, but at different levels based on intent:

- **`INFO`** for `DomainException` and bean-validation failures. These are *expected* failure modes — a 404 is not an incident. Logging them at WARN floods the dashboard.
- **`WARN`** for security-related exceptions (`AccessDeniedException`, `AuthenticationException`) — these aren't errors but they're worth tracking for anomaly detection.
- **`ERROR`** for the catch-all and for `DataIntegrityViolationException` and similar infrastructure-class errors. These are real problems.

The catch-all is the only handler that logs the full stack trace. Domain exceptions don't need it; the throwing code is identifiable by the `code` and the correlation ID.

## Auto-configuration

The starter's auto-config wires the handler unless the consuming service overrides it:

```java
@AutoConfiguration
@ConditionalOnClass(RestControllerAdvice.class)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ExceptionHandlerAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public GlobalExceptionHandler platformGlobalExceptionHandler() {
        return new GlobalExceptionHandler();
    }
}
```

`@ConditionalOnMissingBean` is the override hook. A service that needs custom handling defines its own `GlobalExceptionHandler` bean and the auto-configured one steps aside.

## How a service consumes it

One dependency:

```xml
<dependency>
    <groupId>com.acme.platform</groupId>
    <artifactId>platform-exception-handler</artifactId>
</dependency>
```

(With the version managed by the [platform BOM](/writing/centralized-dependency-management-bom).)

The service starts up and the handler is wired. Controllers throw domain exceptions. Responses come out as ProblemDetails. Stack traces never reach the wire. Nothing else changes.

## Override hooks

Centralised does not mean rigid. Services need escape hatches for legitimate special cases:

- **Service-specific exception types.** A service can subclass `DomainException` for its own domain-specific failures. The global handler picks them up automatically because they extend the parent.
- **Service-specific handlers.** Define an additional `@RestControllerAdvice` with a higher `@Order(1)` — Spring uses the first matching handler. The platform handler runs at default precedence, so service-specific handlers always win.
- **Custom ProblemDetail properties.** The `ProblemDetail.setProperty()` method lets a service add extra fields without forking the library.
- **Disable entirely.** If a service has reasons to handle everything itself, exclude the auto-configuration:

```java
@SpringBootApplication(exclude = ExceptionHandlerAutoConfiguration.class)
```

The override surface is small on purpose. The point of the library is consistency. Make overriding possible; don't make it the default path.

## Summary

A shared exception-handler library does three things at once: it removes try/catch boilerplate from service code, it makes error responses consistent across the fleet, and it ensures no service ever leaks a stack trace because someone forgot to wire the global handler. The work to build it is small — one starter module, six classes, one auto-configuration. The work it saves grows with the size of the fleet.

Three rules to hold to:

- The catch-all returns a generic message and a correlation ID. Never the exception's own message. Never the trace.
- Service code throws `DomainException` subclasses, not raw exceptions. The hierarchy stays small (five types is plenty).
- The library is opt-out, not opt-in. Auto-configured by default. Override via `@ConditionalOnMissingBean` or higher-order `@RestControllerAdvice`.

Microservices give you independence in the things that should differ — the business logic. A shared exception-handler library gives you uniformity in the thing that shouldn't — how the fleet talks about failure.
