import React, { useState } from "react";
import {
  HomeIcon,
  ClockIcon,
  ClipboardIcon,
  FileTextIcon,
  UsersIcon,
  CurrencyIcon,
  AwardIcon,
  SettingsIcon,
  BellIcon,
  BookOpenIcon,
  MegaphoneIcon,
  BuildingIcon,
  GraduationCapIcon
} from "../common/Icons";

export function MobileBottomNavigation({ view, setView, role = "admin", onToggleMenu }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryItems = role === "student" ? [
    { id: "home", label: "Dashboard", Icon: HomeIcon },
    { id: "timetable", label: "Schedule", Icon: ClockIcon },
    { id: "attendance", label: "Attendance", Icon: ClipboardIcon },
    { id: "tests", label: "Tests", Icon: FileTextIcon },
    { id: "more", label: "More", Icon: SettingsIcon, isMore: true }
  ] : role === "parent" ? [
    { id: "home", label: "Dashboard", Icon: HomeIcon },
    { id: "timetable", label: "Schedule", Icon: ClockIcon },
    { id: "attendance", label: "Attendance", Icon: ClipboardIcon },
    { id: "fees", label: "Fees", Icon: CurrencyIcon },
    { id: "more", label: "More", Icon: SettingsIcon, isMore: true }
  ] : [
    { id: "overview", label: "Dashboard", Icon: HomeIcon },
    { id: "students", label: "Students", Icon: UsersIcon },
    { id: "attendance", label: "Attendance", Icon: ClipboardIcon },
    { id: "tests", label: "Tests", Icon: FileTextIcon },
    { id: "more", label: "More", Icon: SettingsIcon, isMore: true }
  ];

  const secondaryMenu = role === "student" ? [
    { id: "materials", label: "Study Materials", Icon: BookOpenIcon },
    { id: "planner", label: "Study Planner", Icon: ClockIcon },
    { id: "progress", label: "Academic Progress", Icon: AwardIcon },
    { id: "announcements", label: "Announcements", Icon: MegaphoneIcon }
  ] : role === "parent" ? [
    { id: "progress", label: "Student Progress", Icon: AwardIcon },
    { id: "announcements", label: "Broadcasts", Icon: MegaphoneIcon }
  ] : [
    { id: "batches", label: "Batches & Classes", Icon: BuildingIcon },
    { id: "courses", label: "Courses", Icon: GraduationCapIcon },
    { id: "fees", label: "Fee Management", Icon: CurrencyIcon },
    { id: "materials", label: "Study Materials", Icon: BookOpenIcon },
    { id: "questions", label: "Question Bank", Icon: BookOpenIcon },
    { id: "announcements", label: "Announcements", Icon: MegaphoneIcon },
    { id: "notifications", label: "Notifications & SMS", Icon: BellIcon },
    { id: "institute", label: "Institute Settings", Icon: SettingsIcon }
  ];

  const handleNavClick = (item) => {
    if (item.isMore) {
      if (onToggleMenu) {
        onToggleMenu();
      } else {
        setShowMoreMenu(!showMoreMenu);
      }
    } else {
      setView(item.id);
      setShowMoreMenu(false);
    }
  };

  return (
    <>
      <nav className="mobile-bottom-nav">
        {primaryItems.map((item) => {
          const active = view === item.id || (item.isMore && showMoreMenu);
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${active ? "active" : ""}`}
              onClick={() => handleNavClick(item)}
            >
              <div className="nav-icon-wrapper">
                <Icon size={22} color={active ? "#2563EB" : "#64748B"} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#2563EB" : "#64748B"
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Secondary Bottom Sheet Menu */}
      {showMoreMenu && (
        <div className="bottom-sheet-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="fx" style={{ justifyContent: "space-between", marginBottom: 16 }}>
              <h3 className="h2" style={{ marginBottom: 0 }}>
                All Modules & Actions
              </h3>
              <button
                className="btn bs bsm"
                onClick={() => setShowMoreMenu(false)}
                style={{ padding: "4px 10px" }}
              >
                Close
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {secondaryMenu.map((m) => {
                const MIcon = m.Icon;
                const active = view === m.id;
                return (
                  <button
                    key={m.id}
                    className="btn bs"
                    style={{
                      justifyContent: "flex-start",
                      padding: "12px 14px",
                      minHeight: 48,
                      background: active ? "#EFF6FF" : "#F8FAFC",
                      borderColor: active ? "#2563EB" : "#E5E7EB",
                      color: active ? "#2563EB" : "#0F172A",
                    }}
                    onClick={() => {
                      setView(m.id);
                      setShowMoreMenu(false);
                    }}
                  >
                    <MIcon size={18} color={active ? "#2563EB" : "#64748B"} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileBottomNavigation;
