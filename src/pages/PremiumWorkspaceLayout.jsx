
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  BookOpen,
  Brain,
  Trophy,
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
    icon: ClipboardCheck,
  },
  {
    label: "Practice",
    path: "/premium-practice",
    icon: BookOpen,
  },
  {
    label: "Smart Revision",
    path: "/smart-revision",
    icon: Brain,
  },
  {
    label: "Challenges",
    path: "/challenges",
    icon: Trophy,
  },
  {
    label: "Performance",
    path: "/performance",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Achievements",
    path: "/achievements",
    icon: Award,
  },
];

function PremiumWorkspaceLayout({ children, activeSection }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function handleSignOut() {
    navigate("/login");
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

        <nav className="premium-navigation" aria-label="Premium navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/premium"}
                onClick={closeSidebar}
                className={({ isActive }) => {
                  const selected =
                    activeSection === item.label || isActive;

                  return `premium-nav-link ${
                    selected ? "premium-nav-link-active" : ""
                  }`;
                }}
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
          >
            <LogOut size={18} />
            <span>Sign out</span>
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

              <h2>{activeSection || "Premium Workspace"}</h2>
            </div>
          </div>

          <div className="premium-topbar-status">
            <span className="premium-status-dot" />
            <span>Premium Member</span>
          </div>
        </header>

        <div className="premium-workspace-content">{children}</div>
      </div>
    </div>
  );
}

export default PremiumWorkspaceLayout;
