import { motion } from "framer-motion";

interface FireworkEffectProps {
  isVisible: boolean;
}

export default function FireworkEffect({ isVisible }: FireworkEffectProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1.5],
            opacity: [1, 0],
            x: [0, Math.cos(i * 30 * Math.PI / 180) * 50],
            y: [0, Math.sin(i * 30 * Math.PI / 180) * 50],
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
        >
          <div 
            className="h-1 w-1 rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500"
            style={{
              boxShadow: "0 0 4px 2px rgba(var(--primary), 0.3)",
            }}
          />
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-0 bg-primary/10 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.2, 0] }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}
