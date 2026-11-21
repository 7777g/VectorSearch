// SHARED LOOKS
// Some Tailwind classes are used in many places (buttons, boxes, input fields).
// We write them once here, so every screen looks the same. Change a color here and it changes everywhere.

// Tailwind classes used in many places, written once.
export const inputClass = "w-full bg-[#0C0D0F] border border-[#2B2E33] rounded-lg px-3 py-2 mt-1 outline-none focus:border-[#FFD23F]";
export const buttonClass = "bg-[#FFD23F] text-black font-semibold rounded-full px-6 py-2 hover:opacity-90 disabled:opacity-50";
export const outlineButtonClass = "border border-[#2B2E33] rounded-full px-4 py-1 text-sm hover:border-[#FFD23F] disabled:opacity-50";
export const cardClass = "bg-[#16181B] border border-[#2B2E33] rounded-2xl p-5";

export const roleNames = {
  admin: "Admin",
  sub_admin: "Sub-admin",
  member: "Member",
  viewer: "Viewer",
};
