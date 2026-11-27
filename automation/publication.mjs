/** Current display name for our own editorial notes. Never apply to quotations,
 * publisher headlines, identifiers, or persisted assessment records/hashes. */
export function publicationCopy(value){return String(value??'').replace(/India News Project/g,'Unfiltered India').replace(/\bINP\b/g,'Unfiltered India');}
