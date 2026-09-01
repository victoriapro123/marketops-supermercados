import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Boxes,
  CircleCheck,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const demoAccounts = [
  { label: 'Encargado', email: 'encargado@marketops.cl', icon: Store },
  { label: 'Soporte', email: 'tecnico@marketops.cl', icon: Wrench },
  { label: 'Administrador', email: 'admin@marketops.cl', icon: ShieldCheck },
];

export default function App() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Activity />
          </div>
          <div>
            <strong>MarketOps</strong>
            <span>Control operacional</span>
          </div>
        </div>

        <div className="login-copy">
          <span className="eyebrow">Acceso al sistema</span>
          <h1 id="login-title">Mantén cada sucursal en movimiento.</h1>
          <p>
            Monitorea equipos, reporta incidencias y coordina al equipo de
            soporte desde un solo lugar.
          </p>
        </div>

        <form className="login-form">
          <div className="field-stack">
            <label htmlFor="email">Correo electrónico</label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@marketops.cl"
              autoComplete="username"
              className="h-11 bg-white"
            />
          </div>
          <div className="field-stack">
            <label htmlFor="password">Contraseña</label>
            <div className="password-field">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                className="h-11 bg-white pr-11"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>
          <Button type="submit" size="lg" className="login-submit">
            Iniciar sesión <ArrowRight />
          </Button>
        </form>

        <div className="demo-accounts">
          <div className="demo-heading">
            <span>Cuentas de demostración</span>
            <small>Contraseña: MarketOps2026!</small>
          </div>
          <div className="demo-grid">
            {demoAccounts.map(({ label, email, icon: Icon }) => (
              <button type="button" key={email} className="demo-account">
                <Icon />
                <span>
                  <strong>{label}</strong>
                  <small>{email}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="operations-panel" aria-label="Resumen de la plataforma">
        <div className="operations-glow" />
        <div className="operations-content">
          <div className="live-pill">
            <span /> Operación en línea
          </div>
          <div className="operations-heading">
            <span className="eyebrow">Red MarketOps</span>
            <h2>Visibilidad clara para reaccionar más rápido.</h2>
          </div>

          <div className="signal-card">
            <div className="signal-topline">
              <div>
                <span>Disponibilidad global</span>
                <strong>94,8%</strong>
              </div>
              <CircleCheck />
            </div>
            <div className="availability-bar" aria-hidden="true">
              <span />
            </div>
            <div className="signal-metrics">
              <div>
                <Store />
                <span><strong>6</strong> sucursales</span>
              </div>
              <div>
                <Boxes />
                <span><strong>42</strong> equipos</span>
              </div>
              <div>
                <Wrench />
                <span><strong>5</strong> incidencias</span>
              </div>
            </div>
          </div>

          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-icon critical"><Wrench /></span>
              <div><strong>Nueva incidencia crítica</strong><small>Caja 04 · Sucursal Providencia</small></div>
              <time>Ahora</time>
            </div>
            <div className="activity-item">
              <span className="activity-icon healthy"><CircleCheck /></span>
              <div><strong>Equipo restablecido</strong><small>Balanza 02 · Sucursal Ñuñoa</small></div>
              <time>12 min</time>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
