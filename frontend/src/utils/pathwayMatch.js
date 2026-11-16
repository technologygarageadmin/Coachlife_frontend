export const normKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const KEYWORDS = ['foundation', 'intermediate', 'advanced', 'tgsession'];

// Names of the CoachLife learning pathways, from whatever shape the store holds.
export const pathwayNamesFrom = (learningPathway) => (
  Array.isArray(learningPathway)
    ? [...new Set(learningPathway.map(p => p.LearningPathway || p.name || p.pathwayName).filter(Boolean))]
    : []
);

/*
 * Technology Garage's `course` is the learning pathway. It may hold a short key
 * ("foundation") or a full name ("AI Foundation for Kids", "Foundation Level"), so
 * match on the text itself first, then on keywords. Returns the CoachLife pathway
 * name, or '' when CoachLife has no such pathway.
 */
export const matchPathway = (np, options) => {
  const byName = (value) => options.find(o => normKey(o) === normKey(value));
  if (np.LearningPathway && byName(np.LearningPathway)) return byName(np.LearningPathway);
  const c = normKey(np.course);
  if (!c) return '';
  if (byName(np.course)) return byName(np.course);
  const contains = options.find(o => { const k = normKey(o); return c.length >= 5 && (k.includes(c) || c.includes(k)); });
  if (contains) return contains;
  const word = KEYWORDS.find(w => c.includes(w));
  return (word && options.find(o => normKey(o).includes(word))) || '';
};

const SHORT_LABELS = { foundation: 'Foundation', intermediate: 'Intermediate', advanced: 'Advanced', tgsessions: 'TG Sessions', tgsessionstest: 'TG Sessions (test)' };

// Readable name for a Technology Garage course, for messages.
export const courseName = (course) => {
  const key = String(course || '').toLowerCase();
  return SHORT_LABELS[key] || String(course || '').replace(/\b\w/g, ch => ch.toUpperCase());
};
