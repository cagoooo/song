import { motion } from "framer-motion";

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* 音符动画元素 */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl opacity-10"
          initial={{
            x: Math.random() * 100 - 50,
            y: -20,
            rotate: 0
          }}
          animate={{
            x: Math.random() * 100 - 50,
            y: window.innerHeight + 20,
            rotate: 360
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.5
          }}
        >
          {["🎵", "🎶", "🎸", "🎼"][Math.floor(Math.random() * 4)]}
        </motion.div>
      ))}
      
      {/* 渐变背景动画 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-violet-100/30 via-fuchsia-100/30 to-pink-100/30"
        animate={{
          background: [
            "linear-gradient(to right, rgba(238,233,253,0.3), rgba(253,233,246,0.3), rgba(253,233,241,0.3))",
            "linear-gradient(to right, rgba(253,233,246,0.3), rgba(253,233,241,0.3), rgba(238,233,253,0.3))",
            "linear-gradient(to right, rgba(253,233,241,0.3), rgba(238,233,253,0.3), rgba(253,233,246,0.3))"
          ]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear"
        }}
      />
      
      {/* 波浪效果 */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-white/50 to-transparent"
        animate={{
          y: [0, -10, 0]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />
    </div>
  );
}
