import { Card } from './Card'
import type { CardProps } from './types'

type Dish = {
  name: string
  category: string | null
  prices: number[]
  vegetarian: boolean
  vegan: boolean
  favorite: boolean
}

type Menu = {
  restaurant: string
  date: string
  openingHours: string[]
  dishes: Dish[]
}

const euro = (price: number) => `€${price.toFixed(2)}`

function DietBadge({ dish }: { dish: Dish }) {
  if (dish.vegan) {
    return (
      <span className="bg-vegan text-on-diet rounded px-1.5 text-xs">
        vegan
      </span>
    )
  }
  if (dish.vegetarian) {
    return (
      <span className="bg-vegetarian text-on-diet rounded px-1.5 text-xs">
        veggie
      </span>
    )
  }
  return null
}

function FavouriteStar() {
  return (
    <span
      className="bg-main text-sidenav-blue shrink-0 rounded px-1 text-xs"
      title="One of your favourites"
      aria-label="favourite"
    >
      ★
    </span>
  )
}

export function MenuCard({ result }: CardProps) {
  const menu = result as Menu
  const hours = menu.openingHours.join(', ') || 'closed'

  return (
    <Card
      title={menu.restaurant}
      subtitle={`${menu.date} · ${hours}`}
    >
      {menu.dishes.length === 0 && <p>No dishes on the menu.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {menu.dishes.map((dish, index) => (
          <li
            key={`${dish.name}-${index}`}
            className="flex items-center justify-between gap-2 py-1.5"
          >
            <span className="flex items-center gap-2">
              {dish.favorite && <FavouriteStar />}
              <span className={dish.favorite ? 'font-bold' : undefined}>
                {dish.name}
              </span>
              <DietBadge dish={dish} />
            </span>
            {dish.prices[0] !== undefined && (
              <span className="shrink-0 font-bold">{euro(dish.prices[0])}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
