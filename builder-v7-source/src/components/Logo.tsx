export function Logo({ size = 34 }: { size?: number }) {
  const cells = []
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      cells.push(
        <rect
          key={`${r}${c}`}
          x={c * 11}
          y={r * 11}
          width={9}
          height={9}
          rx={1.5}
          fill={r === 1 && c === 1 ? '#e91e8c' : '#0bbf92'}
        />
      )
  return (
    <svg width={size} height={size} viewBox="0 0 31 31" aria-hidden="true" focusable="false">
      {cells}
    </svg>
  )
}
