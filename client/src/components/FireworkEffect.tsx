import { motion } from "framer-motion";

interface FireworkEffectProps {
  isVisible: boolean;
}

export default function FireworkEffect({ isVisible }: FireworkEffectProps) {
  if (!isVisible) return null;

  const colors = [
    'from-amber-500 via-yellow-500 to-orange-500',
    'from-rose-500 via-pink-500 to-purple-500',
    'from-blue-500 via-cyan-500 to-teal-500',
    'from-emerald-500 via-green-500 to-lime-500',
    'from-violet-500 via-purple-500 to-fuchsia-500',
    'from-red-500 via-orange-500 to-yellow-500'
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 2.5],
            opacity: [1, 0],
            x: [0, Math.cos(i * 18 * Math.PI / 180) * 120],
            y: [0, Math.sin(i * 18 * Math.PI / 180) * 120],
          }}
          transition={{
            duration: 1,
            ease: "easeOut",
            times: [0, 1],
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        >
          <div 
            className={`h-4 w-4 rounded-full bg-gradient-to-r ${colors[i % colors.length]}`}
            style={{
              boxShadow: '0 0 15px 6px rgba(255, 255, 255, 0.5)',
              transform: `rotate(${i * 18}deg)`
            }}
          />
        </motion.div>
      ))}

      {/* 背景光暈效果 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: [0, 0.3, 0],
          scale: [0.8, 1.2, 1]
        }}
        transition={{ 
          duration: 1.2,
          times: [0, 0.5, 1],
          repeat: Infinity,
          repeatDelay: 0.3
        }}
      />

      {/* 放射狀光芒效果 */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-white/40 via-transparent to-transparent"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ 
          opacity: [0, 0.5, 0],
          scale: [0.5, 1.3, 1.6]
        }}
        transition={{ 
          duration: 1.5,
          times: [0, 0.4, 1],
          repeat: Infinity,
          repeatDelay: 0.2
        }}
      />
    </div>
  );
}