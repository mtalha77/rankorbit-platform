import { isPastMeetingNotif } from "../../lib/helpers";

/** Super admin: team-chat pings only. Others: all live (non-past) staff notifs. */
export function filterVisibleStaffNotifs(rows, role) {
  const live = (rows || []).filter((x) => !isPastMeetingNotif(x));
  if (role !== "super_admin") return live;
  return live.filter((x) => x.type === "staff_message");
}
