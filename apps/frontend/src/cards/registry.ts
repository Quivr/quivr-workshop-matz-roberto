import type { ComponentType } from 'react'

import { LibraryCard } from './LibraryCard'
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
}
