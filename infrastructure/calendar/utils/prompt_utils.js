const DEFAULT_TITLE_DESCRIPTION_INSTRUCTIONS = `
DEFAULT TITLE AND DESCRIPTION HANDLING:
- The input text will contain "Sent by: [Actual Sender Name]" at the end
- Extract the actual sender name from this line and use it in the title/description
- The default title should be "[Actual Sender Name]'s [Event Type]" (e.g., "John's Trip", "Sarah's Meeting", "Mike's Vacation")
- The default description should be "[Actual Sender Name]'s [Event Type]" unless more specific details are provided
- Only deviate from this default pattern if:
  1. The user explicitly provides a different title/description
  2. The text contains very specific event details that clearly indicate a different title/description
  3. The context is very far from suggesting a personal event (e.g., something very random)
  4. The sender is making an event on behalf of someone else and that person's name is specified in the request - in this case, use that person's name instead of the sender's name
- When in doubt, default to the sender's name + event type pattern
- For generic terms like "meeting", "appointment", "event", etc., use the sender's name as the default owner
- Examples: 
  - "@254232636694646 i have a trip to Oregon this weekend Sent by: Joaquin Uriarte" -> "Joaquin's Trip to Oregon"
  - "@434434245674322 i have a trip next weekend Sent by: Miranda Mencocho" -> "Miranda's Trip"
  - "@638440340024303 I'm out for the next two weeks. Sent by: Tevaco Mereculo" -> "Tevaco's Trip"
- IMPORTANT: Do NOT use literal text like "[Sender Name]" or "[Actual Sender Name]" - extract and use the real name from the "Sent by:" line
`;

module.exports = {
  DEFAULT_TITLE_DESCRIPTION_INSTRUCTIONS
};