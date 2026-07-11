import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  pulseOffset: number;
}

interface GlassPlate {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  vAngle: number;
  points: { x: number; y: number }[];
}

export default function CinematicBackground({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const themeRef = useRef(theme);

  // Sync theme to ref so animation loop has immediate, smooth access
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Setup elements
    const particles: Particle[] = [];
    const numParticles = 60;
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const networkNodes: NetworkNode[] = [];
    const numNodes = 25;
    for (let i = 0; i < numNodes; i++) {
      networkNodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 3 + 1,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const glassPlates: GlassPlate[] = [];
    const numPlates = 5;
    for (let i = 0; i < numPlates; i++) {
      const size = Math.random() * 60 + 40;
      glassPlates.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.002,
        points: [
          { x: -size / 2, y: -size / 2 },
          { x: size / 2, y: -size / 3 },
          { x: size / 3, y: size / 2 },
          { x: -size / 2, y: size / 3 },
        ],
      });
    }

    // 3D Globe state
    let angleY = 0;
    let angleX = 0.3; // subtle tilt

    const globeRadius = Math.min(width, height) * 0.25;
    const globeCenter = { x: width * 0.75, y: height * 0.5 };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      globeCenter.x = width * 0.75;
      globeCenter.y = height * 0.5;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.05;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.05;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    // Frame loops
    const tick = () => {
      const isLight = themeRef.current === "light";

      // 1. Clear canvas with premium background gradient dynamically
      if (isLight) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, "#F5F5F5");
        bgGrad.addColorStop(0.5, "#EAEAEA");
        bgGrad.addColorStop(1, "#DCDCDC");
        ctx.fillStyle = bgGrad;
      } else {
        ctx.fillStyle = "#0B0B0B";
      }
      ctx.fillRect(0, 0, width, height);

      // Mouse smoothing parallax
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Volumetric radial glow behind dashboard
      const glowGrad = ctx.createRadialGradient(
        globeCenter.x + mouse.x * 1.5,
        globeCenter.y + mouse.y * 1.5,
        10,
        globeCenter.x + mouse.x * 1.5,
        globeCenter.y + mouse.y * 1.5,
        globeRadius * 1.8
      );
      
      const glowColor0 = isLight ? "rgba(255, 255, 255, 0.50)" : "rgba(211, 211, 211, 0.04)";
      const glowColor1 = isLight ? "rgba(255, 255, 255, 0.15)" : "rgba(163, 163, 163, 0.01)";
      glowGrad.addColorStop(0, glowColor0);
      glowGrad.addColorStop(0.5, glowColor1);
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Render glass plates
      glassPlates.forEach((plate) => {
        plate.x += plate.vx;
        plate.y += plate.vy;
        plate.angle += plate.vAngle;

        // Wrap around borders
        if (plate.x < -100) plate.x = width + 100;
        if (plate.x > width + 100) plate.x = -100;
        if (plate.y < -100) plate.y = height + 100;
        if (plate.y > height + 100) plate.y = -100;

        ctx.save();
        ctx.translate(plate.x + mouse.x * 0.3, plate.y + mouse.y * 0.3);
        ctx.rotate(plate.angle);

        // Draw translucent glass shape
        ctx.beginPath();
        plate.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();

        // Soft glass fill
        ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.015)";
        ctx.fill();

        // Subtle specular highlight stroke
        const grad = ctx.createLinearGradient(
          -plate.size / 2,
          -plate.size / 2,
          plate.size / 2,
          plate.size / 2
        );
        const highlight0 = isLight ? "rgba(31, 31, 31, 0.10)" : "rgba(255, 255, 255, 0.06)";
        const highlight1 = isLight ? "rgba(31, 31, 31, 0.04)" : "rgba(255, 255, 255, 0.01)";
        const highlight2 = isLight ? "rgba(31, 31, 31, 0.08)" : "rgba(255, 255, 255, 0.04)";
        grad.addColorStop(0, highlight0);
        grad.addColorStop(0.5, highlight1);
        grad.addColorStop(1, highlight2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });

      // Render network communication nodes and lines
      networkNodes.forEach((node, idx) => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce/Wrap nodes
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Draw node pulsing
        const currentPulse = Math.sin(Date.now() * 0.001 + node.pulseOffset) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(
          node.x + mouse.x * 0.5,
          node.y + mouse.y * 0.5,
          node.size + currentPulse * 1.5,
          0,
          Math.PI * 2
        );
        
        const nodeAlpha = isLight ? 0.22 : 0.15;
        ctx.fillStyle = isLight
          ? `rgba(31, 31, 31, ${nodeAlpha + currentPulse * 0.10})`
          : `rgba(163, 163, 163, ${nodeAlpha + currentPulse * 0.1})`;
        ctx.fill();

        // Connect nearby nodes
        for (let j = idx + 1; j < networkNodes.length; j++) {
          const other = networkNodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.12;
            ctx.beginPath();
            ctx.moveTo(node.x + mouse.x * 0.5, node.y + mouse.y * 0.5);
            ctx.lineTo(other.x + mouse.x * 0.5, other.y + mouse.y * 0.5);
            ctx.strokeStyle = isLight ? `rgba(42, 42, 42, ${alpha * 1.55})` : `rgba(211, 211, 211, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();

            // Draw a tiny light pulse traversing the line
            const pulsePos = ((Date.now() * 0.05 + idx * 25) % 100) / 100;
            const px = node.x + dx * pulsePos + mouse.x * 0.5;
            const py = node.y + dy * pulsePos + mouse.y * 0.5;
            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = isLight ? `rgba(31, 31, 31, ${alpha * 2.2})` : `rgba(255, 255, 255, ${alpha * 2.5})`;
            ctx.fill();
          }
        }
      });

      // Render floating particles
      particles.forEach((p, pIdx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x + mouse.x * 0.8, p.y + mouse.y * 0.8, p.size, 0, Math.PI * 2);
        
        if (isLight) {
          // Varying shades: #1F1F1F, #333333
          const shadeIndex = pIdx % 2;
          const rgb = shadeIndex === 0 ? "31, 31, 31" : "51, 51, 51";
          // Vary opacity between 20% and 80%
          const alpha = Math.min(0.8, Math.max(0.2, p.alpha * 1.3));
          ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(211, 211, 211, ${p.alpha})`;
        }
        ctx.fill();
      });

      // Render mathematical rotating wireframe globe on the right side
      angleY += 0.0012; // slow spin
      angleX = 0.25 + Math.sin(Date.now() * 0.0001) * 0.05; // dynamic breathing rotation

      const latSegments = 9;
      const lonSegments = 16;
      const points3D: { x: number; y: number; z: number; projX: number; projY: number; opacity: number }[] = [];

      // Calculate 3D points
      for (let lat = 0; lat <= latSegments; lat++) {
        const theta = (lat * Math.PI) / latSegments - Math.PI / 2;
        for (let lon = 0; lon < lonSegments; lon++) {
          const phi = (lon * Math.PI * 2) / lonSegments;

          // Sphere coords
          const sx = globeRadius * Math.cos(theta) * Math.cos(phi);
          const sy = globeRadius * Math.sin(theta);
          const sz = globeRadius * Math.cos(theta) * Math.sin(phi);

          // Rotate around Y
          let x1 = sx * Math.cos(angleY) - sz * Math.sin(angleY);
          let z1 = sx * Math.sin(angleY) + sz * Math.cos(angleY);

          // Rotate around X
          let y2 = sy * Math.cos(angleX) - z1 * Math.sin(angleX);
          let z2 = sy * Math.sin(angleX) + z1 * Math.cos(angleX);

          // Perspective scaling
          const focalLength = globeRadius * 2.5;
          const scale = focalLength / (focalLength + z2);
          const projX = globeCenter.x + x1 * scale + mouse.x * 1.2;
          const projY = globeCenter.y + y2 * scale + mouse.y * 1.2;

          // Backside vertices are less visible
          const opacity = (z2 + globeRadius) / (globeRadius * 2); // 0 to 1

          points3D.push({ x: x1, y: y2, z: z2, projX, projY, opacity });
        }
      }

      // Draw globe latitudes (rings horizontal)
      for (let lat = 0; lat <= latSegments; lat++) {
        ctx.beginPath();
        for (let lon = 0; lon <= lonSegments; lon++) {
          const idx = lat * lonSegments + (lon % lonSegments);
          const pt = points3D[idx];
          if (!pt) continue;

          if (lon === 0) {
            ctx.moveTo(pt.projX, pt.projY);
          } else {
            ctx.lineTo(pt.projX, pt.projY);
          }
        }
        // Style lines
        const normalizedLatAlpha = Math.sin((lat / latSegments) * Math.PI); // Fades near poles
        if (isLight) {
          const strokeGrad = ctx.createLinearGradient(
            globeCenter.x - globeRadius,
            globeCenter.y - globeRadius,
            globeCenter.x + globeRadius,
            globeCenter.y + globeRadius
          );
          strokeGrad.addColorStop(0, `rgba(31, 31, 31, ${0.18 * normalizedLatAlpha})`);  // #1F1F1F
          strokeGrad.addColorStop(0.5, `rgba(42, 42, 42, ${0.22 * normalizedLatAlpha})`); // #2A2A2A
          strokeGrad.addColorStop(1, `rgba(58, 58, 58, ${0.14 * normalizedLatAlpha})`);  // #3A3A3A
          ctx.strokeStyle = strokeGrad;
        } else {
          ctx.strokeStyle = `rgba(211, 211, 211, ${0.035 * normalizedLatAlpha})`;
        }
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw globe longitudes (rings vertical)
      for (let lon = 0; lon < lonSegments; lon++) {
        ctx.beginPath();
        for (let lat = 0; lat <= latSegments; lat++) {
          const idx = lat * lonSegments + lon;
          const pt = points3D[idx];
          if (!pt) continue;

          if (lat === 0) {
            ctx.moveTo(pt.projX, pt.projY);
          } else {
            ctx.lineTo(pt.projX, pt.projY);
          }
        }
        if (isLight) {
          const strokeGrad = ctx.createLinearGradient(
            globeCenter.x - globeRadius,
            globeCenter.y - globeRadius,
            globeCenter.x + globeRadius,
            globeCenter.y + globeRadius
          );
          strokeGrad.addColorStop(0, `rgba(31, 31, 31, 0.12)`);  // #1F1F1F
          strokeGrad.addColorStop(0.5, `rgba(42, 42, 42, 0.16)`); // #2A2A2A
          strokeGrad.addColorStop(1, `rgba(58, 58, 58, 0.10)`);  // #3A3A3A
          ctx.strokeStyle = strokeGrad;
        } else {
          ctx.strokeStyle = `rgba(163, 163, 163, 0.03)`;
        }
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw nodes on the globe's intersection points
      points3D.forEach((pt, idx) => {
        if (idx % 3 === 0) {
          const pointAlpha = pt.opacity * 0.15;
          ctx.beginPath();
          ctx.arc(pt.projX, pt.projY, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = isLight ? `rgba(31, 31, 31, ${pointAlpha * 1.6})` : `rgba(255, 255, 255, ${pointAlpha})`;
          ctx.fill();

          // Subtle ping animation on random points
          if (idx % 12 === 0 && Math.random() < 0.015) {
            ctx.beginPath();
            ctx.arc(pt.projX, pt.projY, 6, 0, Math.PI * 2);
            ctx.strokeStyle = isLight
              ? `rgba(31, 31, 31, ${pt.opacity * 0.55})`
              : `rgba(255, 255, 255, ${pt.opacity * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      // Simple, soft frame rates throttle
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      {/* Background canvas for animated particles and 3D globe */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Cinematic Background SVG Grid & Radial Glows from Immersive UI */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,var(--theme-primary)_0%,transparent_70%)] opacity-[0.08] dark:opacity-[0.05] blur-[120px] rounded-full transition-opacity duration-300"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,var(--theme-primary)_0%,transparent_70%)] opacity-[0.05] dark:opacity-[0.03] blur-[100px] rounded-full transition-opacity duration-300"></div>
        
        <svg className="absolute inset-0 w-full h-full opacity-10 md:opacity-15 text-theme-text-secondary transition-opacity duration-300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
              <path d="M 45 0 L 0 0 0 45" fill="none" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Decorative radar circles */}
          <circle cx="75%" cy="50%" r="220" fill="none" stroke="currentColor" strokeWidth="0.25" strokeDasharray="4,6" strokeOpacity="0.25" />
          <circle cx="75%" cy="50%" r="380" fill="none" stroke="currentColor" strokeWidth="0.15" strokeDasharray="2,8" strokeOpacity="0.15" />
        </svg>
      </div>
    </div>
  );
}
