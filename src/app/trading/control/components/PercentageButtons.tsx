import React from 'react'
import { Check, Pencil } from 'lucide-react'

interface PercentageButtonsProps {
    percentageValues: number[]
    percentage: number
    onSetPercentage: (percent: number) => void
    onEditClick: (index: number) => void
    onEditSave: (index: number) => void
    editingIndex: number | null
    editValue: string
    setEditValue: (value: string) => void
    onEditKeyPress: (e: React.KeyboardEvent, index: number) => void
}

export const PercentageButtons: React.FC<PercentageButtonsProps> = ({
    percentageValues,
    percentage,
    onSetPercentage,
    onEditClick,
    onEditSave,
    editingIndex,
    editValue,
    setEditValue,
    onEditKeyPress,
}) => {
    return (
        <div className="flex items-center justify-between 2xl:gap-2 gap-1 mt-3">
            {percentageValues.map((percent, index) => (
                <div key={index} className="relative w-full">
                    {editingIndex === index ? (
                        <div className="flex items-center 2xl:gap-2 gap-[2px] bg-gray-100 dark:bg-neutral-700 rounded-md">
                            <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => onEditKeyPress(e, index)}
                                className="w-full max-w-[40px] bg-transparent 2xl:text-sm text-xs text-gray-900 dark:text-neutral-200 xl:px-2 px-1 py-2 rounded-md focus:outline-none"
                                min="1"
                                max="100"
                                autoFocus
                            />
                            <button
                                onClick={() => onEditSave(index)}
                                className="p-1 text-blue-600 hover:text-blue-700 dark:text-theme-primary-300 dark:hover:text-theme-primary-400"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => onSetPercentage(percent)}
                            className={`2xl:px-[6px] md:px-1 px-0 md:w-fit w-full max-w-[75px] py-1 2xl:h-[30px] lg:h-[25px] h-8 font-semibold 2xl:text-xs text-[8px] rounded-md flex items-center md:justify-around justify-between gap-1 border border-solid transition-colors ${percentage === percent
                                    ? "border-blue-500 text-blue-600 dark:border-linear-start bg-blue-50 dark:bg-theme-primary-400/10"
                                    : "border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
                                }`}
                        >
                            <div className="2xl:text-xs text-[9px] px-1 m-0 p-0 flex-1 md:w-fit w-full">{percent}%</div>
                            <div className='sm:w-5 w-6 h-3 cursor-pointer hover:opacity-80 text-theme-neutral-1000 dark:text-neutral-400 border-l border-black dark:border-neutral-400 flex items-center justify-center'>
                                <Pencil
                                    className="w-2.5 h-2.5"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEditClick(index)
                                    }}
                                />
                            </div>
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
} 
