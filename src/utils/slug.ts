/** Lower-case, hyphenated id derived from a display name ("The Big Hitters" -> "the-big-hitters"). */
export function slugify(name: string): string {
    return name.trim().replace(/\s+/g, "-").toLowerCase();
}
