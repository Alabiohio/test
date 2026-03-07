"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Check, X } from "lucide-react";
import { SKILLS_LIST } from "@/lib/data";

interface SkillInputProps {
    selectedSkills: string[];
    onAddSkill: (skill: string) => void;
    onRemoveSkill: (skill: string) => void;
    placeholder?: string;
    maxSkills?: number;
}

export function SkillInput({
    selectedSkills,
    onAddSkill,
    onRemoveSkill,
    placeholder = "Add a skill (e.g. React, UI Design)...",
    maxSkills = 15
}: SkillInputProps) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter suggestions based on query and already selected skills
    const suggestions = SKILLS_LIST.filter(skill =>
        skill.toLowerCase().includes(query.toLowerCase()) &&
        !selectedSkills.includes(skill)
    ).slice(0, 10);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAdd = (skill: string) => {
        if (selectedSkills.length >= maxSkills) return;
        onAddSkill(skill);
        setQuery("");
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter" && query.trim()) {
            e.preventDefault();
            if (suggestions.length > 0 && activeIndex >= 0) {
                handleAdd(suggestions[activeIndex]);
            } else if (!selectedSkills.includes(query.trim())) {
                handleAdd(query.trim());
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Selected Skills Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
                <AnimatePresence>
                    {selectedSkills.map((skill) => (
                        <motion.span
                            key={skill}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary group transition-all hover:bg-primary/20"
                        >
                            {skill}
                            <button
                                type="button"
                                onClick={() => onRemoveSkill(skill)}
                                className="text-primary/40 hover:text-red-500 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </motion.span>
                    ))}
                </AnimatePresence>
            </div>

            {/* Input Field */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Search className="h-4 w-4" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        setActiveIndex(0);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedSkills.length >= maxSkills ? `Max ${maxSkills} skills reached` : placeholder}
                    disabled={selectedSkills.length >= maxSkills}
                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-11 pr-4 py-4 text-sm font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
                {isOpen && (query || suggestions.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl premium-shadow"
                    >
                        <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                            {suggestions.map((skill, index) => (
                                <button
                                    key={skill}
                                    type="button"
                                    onClick={() => handleAdd(skill)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${index === activeIndex
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                        }`}
                                >
                                    <span>{skill}</span>
                                    {index === activeIndex && <Plus className="h-4 w-4" />}
                                </button>
                            ))}

                            {query && !suggestions.find(s => s.toLowerCase() === query.toLowerCase()) && (
                                <button
                                    type="button"
                                    onClick={() => handleAdd(query.trim())}
                                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-black text-primary hover:bg-primary/5 transition-all text-left border-t border-zinc-100 dark:border-zinc-800 mt-2"
                                >
                                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Plus className="h-4 w-4" />
                                    </div>
                                    <span>Add custom: "{query}"</span>
                                </button>
                            )}

                            {query && suggestions.length === 0 && !query.trim() && (
                                <div className="px-4 py-8 text-center text-zinc-400 text-xs italic">
                                    No matching skills found.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
