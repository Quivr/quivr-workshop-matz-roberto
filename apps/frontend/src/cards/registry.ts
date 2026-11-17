import type { ComponentType } from 'react'

import { ClassmatesCard } from './ClassmatesCard'
import { LibraryCard } from './LibraryCard'
import { DatePlanCard } from './DatePlanCard'
import { EventsCard } from './EventsCard'
import { FreeTimeCard } from './FreeTimeCard'
import { InviteCard } from './InviteCard'
import { MatchMapCard } from './MatchMapCard'
import { MenuCard } from './MenuCard'
import { RestaurantsCard } from './RestaurantsCard'
import { ScheduleCard } from './ScheduleCard'
import { StudentCard } from './StudentCard'
import type { CardProps } from './types'

/** Tool name → card. Tools without a card use ToolCallCard. Add new cards here. */
export const cards: Record<string, ComponentType<CardProps>> = {
  get_my_schedule: ScheduleCard,
  get_menu: MenuCard,
  list_restaurants: RestaurantsCard,
  get_library_occupancy: LibraryCard,
  get_student_card: StudentCard,
  get_classmates: ClassmatesCard,
  find_matches: MatchMapCard,
  send_date_invite: InviteCard,
  get_campus_events: EventsCard,
  plan_date: DatePlanCard,
  find_shared_free_time: FreeTimeCard,
}

/** Cards that also render while the tool is still running (`result` is undefined). */
export const liveCards = new Set(['find_matches'])

/** Cards that also render when the tool failed (`error` is set). */
export const errorCards = new Set(['send_date_invite'])
