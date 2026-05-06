import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { TestimonialBand } from "@/components/TestimonialBand";
import { Capability } from "@/components/sections/Capability";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { ProofGrid } from "@/components/sections/ProofGrid";
import { Education } from "@/components/sections/Education";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Manifesto />
      <TestimonialBand />
      <Capability />
      <CaseStudies />
      <ProofGrid />
      <Education />
      <Contact />
    </>
  );
}
