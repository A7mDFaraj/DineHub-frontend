export interface PreparationLine {
  subject: string;
  details: string[];
  modifiers: string[];
  isTakeaway: boolean;
  specialNote: string;
}

export function preparationSubject(subject: string) {
  const match = subject.match(/^(\d+)\s*[×x]\s*(.+)$/u);
  return match ? { quantity: Number(match[1]), name: match[2].trim() } : null;
}

interface ParsedOrderNote {
  preparation: PreparationLine[];
  generalNote: string;
}

export function parseOrderNote(note: string): ParsedOrderNote {
  const preparation: PreparationLine[] = [];
  const generalLines: string[] = [];
  let section: "preparation" | "general" | null = null;
  let foundStructuredSection = false;

  // Customer notes may span lines. Only a new bullet or section starts a record.
  for (const rawLine of note.split(
    /\r?\n(?=\s*(?:•|General notes\s*:|ملاحظات عامة\s*:|Preparation details\s*:|تفاصيل التحضير\s*:))/i,
  )) {
    const line = rawLine.trim();
    if (!line) continue;

    const preparationHeading = line.match(
      /^(?:Preparation details|تفاصيل التحضير)\s*:\s*([\s\S]*)$/i,
    );
    if (preparationHeading) {
      foundStructuredSection = true;
      section = "preparation";
      if (!preparationHeading[1]) continue;
    }

    const generalHeading = line.match(
      /^(?:General notes|ملاحظات عامة)\s*:\s*([\s\S]*)$/i,
    );
    if (generalHeading) {
      foundStructuredSection = true;
      section = "general";
      if (generalHeading[1]) generalLines.push(generalHeading[1]);
      continue;
    }

    if (section === "preparation") {
      const content = (preparationHeading?.[1] || line).replace(/^•\s*/, "");
      const instruction = content.match(/^(.+?)\s*:\s*([\s\S]*)$/);
      const subject = instruction?.[1]?.trim() || content;
      const details = (instruction?.[2] || "")
        .split(/\s+—\s+/)
        .map((detail) => detail.trim())
        .filter(Boolean);
      const specialIndex = details.findIndex((detail) =>
        /^(?:Special note|ملاحظة خاصة)\s*:/i.test(detail),
      );
      const specialNote =
        specialIndex < 0
          ? ""
          : details
              .slice(specialIndex)
              .join(" — ")
              .replace(/^(?:Special note|ملاحظة خاصة)\s*:\s*/i, "");
      const options =
        specialIndex < 0 ? details : details.slice(0, specialIndex);
      const modifierPrefix = /^(?:Selected option|إضافة مختارة)\s*:\s*/i;
      // The preceding serializer marked written notes; values before that
      // marker are preset options even without the newer option prefix.
      const isPreset = (detail: string) =>
        modifierPrefix.test(detail) ||
        (specialIndex >= 0 &&
          !/^(?:takeaway|سفري|standard preparation|بدون تخصيص)$/i.test(detail));
      const modifiers = options
        .filter(isPreset)
        .map((detail) => detail.replace(modifierPrefix, ""));
      const isTakeaway = options.some(
        (detail) =>
          detail.toLocaleLowerCase() === "takeaway" || detail === "سفري",
      );
      preparation.push({
        specialNote,
        modifiers,
        subject,
        details: options.filter(
          (detail) =>
            detail.toLocaleLowerCase() !== "takeaway" &&
            detail !== "سفري" &&
            !isPreset(detail),
        ),
        isTakeaway,
      });
      continue;
    }

    if (section === "general") {
      generalLines.push(line);
      continue;
    }

    generalLines.push(line);
  }

  return {
    preparation,
    generalNote: foundStructuredSection ? generalLines.join("\n") : note.trim(),
  };
}
