import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
  onClear?: () => void;
  title?: string;
}

export function DatePickerModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  onClear,
  title = 'Select Date',
}: DatePickerModalProps) {
  const [activeMonth, setActiveMonth] = useState<Date>(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const parts = selectedDate.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    }
    return new Date();
  });

  // Sync active month when modal opens or selectedDate changes
  useEffect(() => {
    if (visible && selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const parts = selectedDate.split('-');
      setActiveMonth(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
    }
  }, [visible, selectedDate]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const daysArray = useMemo(() => {
    const year = activeMonth.getFullYear();
    const month = activeMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNum: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: null, dateStr: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      days.push({ dayNum: d, dateStr: `${year}-${monthStr}-${dayStr}` });
    }
    return days;
  }, [activeMonth]);

  const handlePickToday = () => {
    onSelectDate(todayStr);
    onClose();
  };

  const handlePickYesterday = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    onSelectDate(`${yyyy}-${mm}-${dd}`);
    onClose();
  };

  const formattedSelectedDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return selectedDate;
  }, [selectedDate]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end sm:justify-center items-center p-0 sm:p-5">
        <View className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md border border-border/60">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border/40 mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar" size={20} color="#1B4332" />
              <Text className="text-text-primary font-sans-bold text-lg">{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={22} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <View className="flex-row items-center gap-2 mb-4">
            <TouchableOpacity
              onPress={handlePickToday}
              className="flex-1 py-2.5 px-3 rounded-xl border border-primary/30 bg-primary/10 items-center"
            >
              <Text className="font-sans-semibold text-xs text-[#1B4332]">Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickYesterday}
              className="flex-1 py-2.5 px-3 rounded-xl border border-border/80 bg-surface items-center"
            >
              <Text className="text-text-primary font-sans-medium text-xs">Yesterday</Text>
            </TouchableOpacity>

            {onClear && selectedDate ? (
              <TouchableOpacity
                onPress={() => {
                  onClear();
                  onClose();
                }}
                className="py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 items-center"
              >
                <Text className="text-rose-700 font-sans-semibold text-xs">Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Calendar Month Header & Navigation */}
          <View className="flex-row items-center justify-between bg-surface/80 px-4 py-2.5 rounded-2xl border border-border/50 mb-3">
            <TouchableOpacity
              onPress={() => {
                const d = new Date(activeMonth);
                d.setMonth(d.getMonth() - 1);
                setActiveMonth(d);
              }}
              className="p-1.5 rounded-lg bg-white border border-border/60"
            >
              <Ionicons name="chevron-back" size={16} color="#1B4332" />
            </TouchableOpacity>

            <Text className="text-text-primary font-sans-bold text-sm">
              {activeMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </Text>

            <TouchableOpacity
              onPress={() => {
                const d = new Date(activeMonth);
                d.setMonth(d.getMonth() + 1);
                setActiveMonth(d);
              }}
              className="p-1.5 rounded-lg bg-white border border-border/60"
            >
              <Ionicons name="chevron-forward" size={16} color="#1B4332" />
            </TouchableOpacity>
          </View>

          {/* Day of Week Header */}
          <View className="flex-row items-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dayName, i) => (
              <View key={i} className="w-[14.28%] items-center py-1">
                <Text className="text-text-muted font-sans-semibold text-[11px] uppercase">
                  {dayName}
                </Text>
              </View>
            ))}
          </View>

          {/* Interactive Calendar Days Grid */}
          <View className="flex-row flex-wrap mb-4">
            {daysArray.map((cell, idx) => {
              if (!cell.dayNum || !cell.dateStr) {
                return <View key={idx} className="w-[14.28%] h-10" />;
              }

              const isSelected = selectedDate === cell.dateStr;
              const isToday = todayStr === cell.dateStr;

              return (
                <View key={idx} className="w-[14.28%] h-10 items-center justify-center p-0.5">
                  <TouchableOpacity
                    onPress={() => {
                      onSelectDate(cell.dateStr!);
                      onClose();
                    }}
                    className={`w-9 h-9 rounded-full items-center justify-center ${
                      isSelected
                        ? 'bg-[#1B4332]'
                        : isToday
                          ? 'bg-emerald-100 border border-emerald-400'
                          : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-xs font-sans-semibold ${
                        isSelected
                          ? 'text-white'
                          : isToday
                            ? 'text-emerald-900'
                            : 'text-text-primary'
                      }`}
                    >
                      {cell.dayNum}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Selected Date Summary & Confirm */}
          {selectedDate ? (
            <View className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="checkmark-circle" size={18} color="#1B4332" />
                <Text className="text-primary font-sans-bold text-xs" style={{ color: '#1B4332' }}>
                  Selected: {formattedSelectedDateLabel || selectedDate}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="px-3 py-1.5 bg-[#1B4332] rounded-xl">
                <Text className="text-white font-sans-bold text-xs">Done</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
