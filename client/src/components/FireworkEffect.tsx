import { motion } from "framer-motion";

interface FireworkEffectProps {
  isVisible: boolean;
  position?: "fixed" | "absolute";
  zIndex?: number;
}

export default function FireworkEffect({ 
  isVisible, 
  position = "fixed",
  zIndex = 50 
}: FireworkEffectProps) {
  if (!isVisible) return null;

  const colors = [
    'from-amber-500 via-yellow-500 to-orange-500',
    'from-rose-500 via-pink-500 to-purple-500',
    'from-blue-500 via-cyan-500 to-teal-500',
    'from-emerald-500 via-green-500 to-lime-500',
    'from-violet-500 via-purple-500 to-fuchsia-500'
  ];

  return (
    <div 
      className={`${position} inset-0 pointer-events-none overflow-hidden`}
      style={{ zIndex }}
    >
      {/* 主要煙火效果 */}
      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 3],
            opacity: [1, 0],
            x: [0, Math.cos(i * 15 * Math.PI / 180) * 100],
            y: [0, Math.sin(i * 15 * Math.PI / 180) * 100],
          }}
          transition={{
            duration: 1.2,
            ease: "easeOut",
            times: [0, 1],
            repeat: 1,
            repeatDelay: 0.5
          }}
        >
          <div 
            className={`h-3 w-3 rounded-full bg-gradient-to-r ${colors[i % colors.length]}`}
            style={{
              boxShadow: '0 0 15px 5px rgba(255, 255, 255, 0.5)',
              filter: 'brightness(1.2)',
            }}
          />
        </motion.div>
      ))}

      {/* 小型閃光效果 */}
      {[...Array(32)].map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          className="absolute left-1/2 top-1/2"
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1.5],
            opacity: [1, 0],
            x: [0, Math.cos(i * 11.25 * Math.PI / 180) * 150],
            y: [0, Math.sin(i * 11.25 * Math.PI / 180) * 150],
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            delay: Math.random() * 0.3,
            repeat: 2,
            repeatDelay: 0.4
          }}
        >
          <div 
            className={`h-2 w-2 rounded-full bg-white`}
            style={{
              boxShadow: '0 0 10px 3px rgba(255, 255, 255, 0.6)',
            }}
          />
        </motion.div>
      ))}

      {/* 背景閃光效果 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 0.4, 0],
          scale: [0.8, 1.1, 1]
        }}
        transition={{ 
          duration: 0.8,
          repeat: 2,
          repeatDelay: 0.4
        }}
      />
    </div>
  );
}