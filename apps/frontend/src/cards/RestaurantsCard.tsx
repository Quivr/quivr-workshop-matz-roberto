import { Card } from './Card'
import type { CardProps } from './types'

type Restaurant = {
  id: string
  name: string
  address?: string
}

export function RestaurantsCard({ result }: CardProps) {
  const restaurants = (result ?? []) as Restaurant[]

  return (
    <Card
      title="Student restaurants"
      subtitle={`${restaurants.length} restaurant${restaurants.length === 1 ? '' : 's'}`}
    >
      {restaurants.length === 0 && <p>No restaurants found.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {restaurants.map(restaurant => (
          <li
            key={restaurant.id}
            className="flex items-baseline justify-between gap-3 py-1.5"
          >
            <span>
              <span className="font-bold">{restaurant.name}</span>
              {restaurant.address && (
                <span className="text-sidenav-secondary block text-xs">
                  📍 {restaurant.address}
                </span>
              )}
            </span>
            <span className="text-sidenav-secondary bg-schedule-bg-grey shrink-0 rounded px-1.5 text-xs">
              {restaurant.id}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
