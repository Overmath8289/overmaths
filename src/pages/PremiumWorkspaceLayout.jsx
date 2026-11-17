
import React, { useState } from "react";
import {
  NavLink,
  useNavigate,
  useLocation,
  Outlet,
} from "react-router-dom";

import { supabase } from "../supabaseClient";

import {
  LayoutDashboard,
  GraduationCap,
  Target,
  BookOpen,
  Brain,
  Swords,
  Bot,
  ChartNoAxesCombined,
  Award,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronRight,
} from "lucide-react";

import "./PremiumWorkspaceLayout.css";

const navigationItems = [
  {
    label: "Command Center",
    path: "/premium",
    icon: LayoutDashboard,
  },
  {
    label: "My Exam",
    path: "/my-exam",
    icon: GraduationCap,
  },
  {
    label: "Daily Mission",
    path: "/daily-mission",
    icon: Target,
  },
  {
    label: "Practice & Mastery",
    path: "/practice-mastery",
    icon: BookOpen,
  },
  {
    label: "Revision Centre",
    path: "/revision-centre",
    icon: Brain,
  },
  {
    label: "Battle Arena",
    path: "/battle-arena",
    icon: Swords,
  },
  {
    label: "AI Study Coach",
    path: "/ai-study-coach",
    icon: Bot,
  },
  {
    label: "Performance & Readiness",
    path: "/performance-readiness",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Achievements & Streaks",
    path: "/achievements-streaks",
    icon: Award,
  },
];

function PremiumWorkspaceLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const activeItem = navigationItems.find((item) => {
    if (item.path === "/premium") {
      return location.pathname === "/premium";
    }

    return (
      location.pathname === item.path ||
      location.pathname.startsWith(`${item.path}/`)
    );
  });

  const pageTitle = activeItem?.label || "Premium Workspace";

  function closeSidebar() {
    setSidebarOpen(false);
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("SIGN OUT ERROR:", error);
      alert("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <div className="premium-workspace">
      {sidebarOpen && (
        <button
          className="premium-sidebar-overlay"
          type="button"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`premium-sidebar ${
          sidebarOpen ? "premium-sidebar-open" : ""
        }`}
      >
        <div className="premium-brand">
          <div className="premium-brand-icon">
            <Sparkles size={24} />
          </div>

          <div className="premium-brand-text">
            <strong>OVERMATHS</strong>
            <span>PREMIUM WORKSPACE</span>
          </div>

          <button
            type="button"
            className="premium-mobile-close"
            aria-label="Close sidebar"
            onClick={closeSidebar}
          >
            <X size={21} />
          </button>
        </div>

        <div className="premium-sidebar-caption">
          LEARNING WORKSPACE
        </div>

        <nav
          className="premium-navigation"
          aria-label="Premium navigation"
        >
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/premium"}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `premium-nav-link ${
                    isActive
                      ? "premium-nav-link-active"
                      : ""
                  }`
                }
              >
                <Icon size={19} strokeWidth={1.8} />

                <span>{item.label}</span>

                <ChevronRight
                  className="premium-nav-chevron"
                  size={16}
                />
              </NavLink>
            );
          })}
        </nav>

        <div className="premium-sidebar-bottom">
          <div className="premium-upgrade-card">
            <div className="premium-upgrade-icon">
              <Sparkles size={19} />
            </div>

            <strong>Your potential is unlimited.</strong>

            <p>
              Keep learning, practising, and improving every day.
            </p>
          </div>

          <button
            type="button"
            className="premium-signout-button"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut size={18} />
            <span>
              {signingOut ? "Signing out..." : "Sign out"}
            </span>
          </button>
        </div>
      </aside>

      <div className="premium-workspace-main">
        <header className="premium-topbar">
          <div className="premium-topbar-left">
            <button
              type="button"
              className="premium-mobile-menu"
              aria-label="Open navigation menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={23} />
            </button>

            <div>
              <p className="premium-topbar-eyebrow">
                YOUR LEARNING JOURNEY
              </p>

              <h2>{pageTitle}</h2>
            </div>
          </div>

          <div className="premium-topbar-status">
            <span className="premium-status-dot" />
            <span>Premium Member</span>
          </div>
        </header>

        <div className="premium-workspace-content">
          {children ?? <Outlet />}
        </div>
      </div>
    </div>
  );
}

export default PremiumWorkspaceLayout;
