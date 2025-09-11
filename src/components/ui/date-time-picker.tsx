"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface DateTimePickerProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  date,
  onSelect,
  placeholder = "날짜와 시간을 선택하세요",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && date) {
      // Keep existing time when date changes
      const newDate = new Date(selectedDate);
      newDate.setHours(date.getHours());
      newDate.setMinutes(date.getMinutes());
      onSelect?.(newDate);
    } else if (selectedDate) {
      // Set to current time if no existing time
      const newDate = new Date(selectedDate);
      const now = new Date();
      newDate.setHours(now.getHours());
      newDate.setMinutes(Math.floor(now.getMinutes() / 5) * 5); // Round to nearest 5 minutes
      onSelect?.(newDate);
    }
  };

  const handleTimeChange = (type: "hour" | "minute", value: number) => {
    if (date) {
      const newDate = new Date(date);
      if (type === "hour") {
        newDate.setHours(value);
      } else if (type === "minute") {
        newDate.setMinutes(value);
      }
      onSelect?.(newDate);
    } else {
      // If no date selected, set to today with the selected time
      const newDate = new Date();
      if (type === "hour") {
        newDate.setHours(value);
      } else if (type === "minute") {
        newDate.setMinutes(value);
      }
      onSelect?.(newDate);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "yyyy년 MM월 dd일 HH:mm", { locale: ko })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="sm:flex">
          {/* Calendar */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
          
          {/* Time Selection */}
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            {/* Hours (24-hour format) */}
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2 gap-1">
                {Array.from({ length: 24 }, (_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={
                      date && date.getHours() === i ? "default" : "ghost"
                    }
                    className="sm:w-full shrink-0 min-w-[2.5rem]"
                    onClick={() => handleTimeChange("hour", i)}
                  >
                    {i.toString().padStart(2, "0")}시
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            
            {/* Minutes (5-minute intervals) */}
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2 gap-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const minute = i * 5;
                  return (
                    <Button
                      key={minute}
                      size="sm"
                      variant={
                        date && date.getMinutes() === minute
                          ? "default"
                          : "ghost"
                      }
                      className="sm:w-full shrink-0 min-w-[2.5rem]"
                      onClick={() => handleTimeChange("minute", minute)}
                    >
                      {minute.toString().padStart(2, "0")}분
                    </Button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="p-3 border-t flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              // Round to nearest 5 minutes
              now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
              onSelect?.(now);
            }}
          >
            현재 시간
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            완료
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 