"use client";
import { motion } from "framer-motion";
import { sectionVariants } from "@/styles/animations";
import Image from "next/image";

export function About() {
  return (
    <motion.section
      id="about"
      className="py-24 sm:py-32"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
          <div className="md:col-span-1">
            <div className="relative aspect-square rounded-full overflow-hidden shadow-2xl">
              <Image
                src="/profile-picture.jpg"
                alt="Kishore Kumar Sharma"
                layout="fill"
                objectFit="cover"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl mb-6">
              About Me
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Hello! I&apos;m Kishore Kumar Sharma, a passionate and results-oriented Senior Full Stack Engineer with over 6 years of experience in designing, developing, and deploying high-performance web applications. My journey in tech has been driven by a relentless curiosity and a desire to build things that make a difference.
              </p>
              <p>
                I specialize in the MERN stack (MongoDB, Express.js, React, Node.js) and have a strong command of modern front-end and back-end technologies. I&apos;m adept at creating seamless user experiences and robust server-side logic.
              </p>
              <p>
                When I&apos;m not coding, you can find me exploring the latest tech trends, contributing to open-source projects, or enjoying a good cup of coffee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
