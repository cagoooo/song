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
    'from-emerald-500 via-green-500 to-lime-500'
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 2],
            opacity: [1, 0],
            x: [0, Math.cos(i * 22.5 * Math.PI / 180) * 60],
            y: [0, Math.sin(i * 22.5 * Math.PI / 180) * 60],
          }}
          transition={{
            duration: 0.7,
            ease: "easeOut",
            times: [0, 1],
          }}
        >
          <div 
            className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${colors[i % colors.length]}`}
            style={{
              boxShadow: '0 0 8px 2px rgba(255, 255, 255, 0.3)',
            }}
          />
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}