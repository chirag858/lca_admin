"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeySquare,
  Lock,
  ShieldCheck,
  Building2,
  Users,
  User,
  Check,
} from "lucide-react";
import Brand from "./brand";

export default function AdminLogin() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      if (response.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Unable to sign in. Please try again.");
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <section className="login-story">
        <Brand />
        <div className="story-content">
          <span className="eyebrow">PLATFORM ADMINISTRATION</span>
          <h1>
            Every tenant.
            <br />
            One control center.
          </h1>
          <p>
            Onboard tenants, assign subscription plans, and manage firm
            &amp; staff limits across the platform.
          </p>
          <ul className="feature-list">
            {[
              "Create tenants in seconds",
              "Plan-based firm & staff limits",
              "Usage tracked in real time",
            ].map((f) => (
              <li key={f}>
                <Check size={14} /> {f}
              </li>
            ))}
          </ul>
          <div className="illustration">
            <div className="orbit" />
            <div className="illustration-card">
              <span className="icon-tile">
                <Building2 size={26} />
              </span>
              <span>
                Tenant overview<small>Plans, limits, usage.</small>
              </span>
              <span className="live-dot" />
              <div className="bars">
                {[40, 65, 50, 80, 58, 95, 70, 88].map((v, i) => (
                  <i key={i} style={{ height: v }} />
                ))}
              </div>
              <div className="illustration-bottom">
                <span>Across every subscription tier</span>
                <Users size={20} />
              </div>
            </div>
            <div className="float-label">
              <ShieldCheck size={20} /> Platform-admin accounts only.
            </div>
          </div>
        </div>
        <small>© {new Date().getFullYear()} LCA Solutions</small>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="icon-tile">
            <KeySquare size={25} />
          </span>
          <h2>Platform Admin</h2>
          <p>Sign in with your admin username/email and password.</p>
          <form onSubmit={submit}>
            <label>
              Username or email
              <div className="input-icon">
                <User size={18} />
                <input
                  name="usernameOrEmail"
                  autoComplete="username"
                  placeholder="Enter your admin username or email"
                  required
                  autoFocus
                />
              </div>
            </label>
            <label>
              Password
              <div className="password-wrap input-icon">
                <Lock size={18} />
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="primary login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="demo-note">
            <ShieldCheck size={18} />
            <span>Platform-admin access only.</span>
          </div>
          <small className="login-help">
            Tenant owner? Sign in at{" "}
            <a href={process.env.NEXT_PUBLIC_TENANT_APP_URL || "/"}>
              the tenant workspace
            </a>{" "}
            instead.
          </small>
        </div>
        <span className="panel-footer">
          LCA Solutions · Platform administration.
        </span>
      </section>
    </main>
  );
}
