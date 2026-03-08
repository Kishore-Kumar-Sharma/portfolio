'use client';
import { motion } from "framer-motion";
import { sectionVariants, cardVariants } from "@/styles/animations";

const SkillBadge = ({ skill }: { skill: string }) => (
    <motion.div 
        className="bg-secondary dark:bg-secondary/50 text-secondary-foreground dark:text-primary/80 rounded-full px-4 py-2 text-sm font-medium shadow-md"
        variants={cardVariants}
    >
        {skill}
    </motion.div>
);

export function Skills({ skills }: { skills: any }) {
  const skillCategories = Object.keys(skills);

  return (
    <motion.section 
      id="skills"
      className="py-32"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-space-grotesk text-primary mb-4">Core Competencies</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A snapshot of my technical skills and expertise. I&apos;m always learning and expanding my toolkit.
          </p>
        </div>

        <div className="space-y-12">
            {skillCategories.map((category, index) => (
                <motion.div key={index} variants={sectionVariants}>
                    <h3 className="text-xl font-bold font-space-grotesk text-primary/90 mb-6 capitalize text-center md:text-left">{category.replace(/([A-Z])/g, ' $1')}</h3>
                    <motion.div 
                        className="flex flex-wrap justify-center md:justify-start gap-4"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.2 }}
                        variants={{ 
                            visible: { transition: { staggerChildren: 0.1 } } 
                        }}
                    >
                        {skills[category].map((skill: string, skillIndex: number) => (
                            <SkillBadge key={skillIndex} skill={skill} />
                        ))}
                    </motion.div>
                </motion.div>
            ))}
        </div>
      </div>
    </motion.section>
  )
}
