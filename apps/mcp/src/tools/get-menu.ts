import { z } from 'zod'

import { dateSchema, defineTool } from './define-tool.js'

export const getMenu = defineTool({
  name: 'get_menu',
  description:
    'Get the menu of one student restaurant on one day: opening hours and dishes with prices (EUR, student price first), vegetarian/vegan flags (vegan dishes count as vegetarian), allergens and a favorite flag (true when the student marked that dish as a favourite in Quivr, so you can answer "is one of my favourites on the menu today"). Get the restaurant id from list_restaurants first.',
  inputSchema: {
    restaurantId: z.string().describe('Restaurant id from list_restaurants'),
    date: dateSchema.describe('Day, YYYY-MM-DD'),
  },
  run: async ({ restaurantId, date }, quivr) => {
    const { restaurants } = await quivr.getMenu(restaurantId, date)
    const restaurant = restaurants[0]
    if (!restaurant) throw new Error(`No restaurant with id ${restaurantId}`)

    return {
      restaurant: restaurant.name,
      date,
      openingHours: restaurant.openingHours.flatMap(day =>
        day.data.map(slot => `${slot.openFrom}-${slot.openUntil}`)
      ),
      dishes: restaurant.dishes.map(dish => ({
        name: dish.name.trim().replace(/[.,;]+$/, ''),
        category: dish.mealCategory,
        prices: dish.prices,
        vegetarian: dish.vegetarian || dish.vegan,
        vegan: dish.vegan,
        allergens: dish.allergens,
        favorite: dish.favorite,
      })),
    }
  },
})
