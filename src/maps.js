export const maps = {
  1: {
    name: 'Đảo Bến',
    radius: 30,
    centers: [0],
    pads: [],
    lanterns: Array.from({ length: 5 }, (_, index) => {
      const angle = 2 * Math.PI * index / 5
      return [14 * Math.cos(angle), 0, 14 * Math.sin(angle)]
    }),
  },
}
