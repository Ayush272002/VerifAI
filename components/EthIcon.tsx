/**
 * @fileoverview Ethereum Icon Component
 * Blue ETH icon for pricing displays
 */

interface EthIconProps {
  className?: string;
}

export function EthIcon({ className = "w-4 h-4" }: EthIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <path
          d="M12 2L5 12.5L12 16.5L19 12.5L12 2Z"
          fill="#627EEA"
          fillOpacity="0.8"
        />
        <path
          d="M12 17.5L5 13.5L12 22L19 13.5L12 17.5Z"
          fill="#627EEA"
          fillOpacity="0.6"
        />
        <path
          d="M12 2L19 12.5L12 16.5V2Z"
          fill="#627EEA"
          fillOpacity="1"
        />
      </g>
    </svg>
  );
}
