import type { ToolDefinition } from './define-tool.js'
import { getClassmates } from './get-classmates.js'
import { findMatches } from './find-matches.js'
import { findSharedFreeTime } from './find-shared-free-time.js'
import { getCampusEvents } from './get-campus-events.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { getStudentCard } from './get-student-card.js'
import { listRestaurants } from './list-restaurants.js'
import { planDate } from './plan-date.js'
import { sendDateInvite } from './send-date-invite.js'

/** Every tool the MCP server exposes. Add new tools here. */
export const tools = [
  getMySchedule,
  listRestaurants,
  getMenu,
  getLibraryOccupancy,
  getStudentCard,
  getClassmates,
  findMatches,
  findSharedFreeTime,
  planDate,
  getCampusEvents,
  sendDateInvite,
] as ToolDefinition[]
