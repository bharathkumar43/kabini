/**
 * Utility functions to filter out emojis from text inputs
 */

// Regex to match emoji characters (including emoji sequences, modifiers, etc.)
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]|[\u{1FA70}-\u{1FA93}]|[\u{1FAB0}-\u{1FABD}]|[\u{1FAC0}-\u{1FAF0}]|[\u{1FB00}-\u{1FB4B}]|[\u{1FB50}-\u{1FBAF}]|[\u{1FBB0}-\u{1FBCA}]|[\u{1FBD0}-\u{1FBEF}]|[\u{1FBF0}-\u{1FBFF}]|[\u{1FC00}-\u{1FC23}]|[\u{1FC30}-\u{1FC56}]|[\u{1FC60}-\u{1FC78}]|[\u{1FC80}-\u{1FC9C}]|[\u{1FCA0}-\u{1FCA4}]|[\u{1FCC0}-\u{1FCC4}]|[\u{1FCD0}-\u{1FCD4}]|[\u{1FCE0}-\u{1FCE4}]|[\u{1FCF0}-\u{1FCF4}]|[\u{1FD00}-\u{1FD23}]|[\u{1FD30}-\u{1FD56}]|[\u{1FD60}-\u{1FD78}]|[\u{1FD80}-\u{1FD9C}]|[\u{1FDA0}-\u{1FDA4}]|[\u{1FDB0}-\u{1FDB4}]|[\u{1FDC0}-\u{1FDC4}]|[\u{1FDD0}-\u{1FDD4}]|[\u{1FDE0}-\u{1FDE4}]|[\u{1FDF0}-\u{1FDF4}]|[\u{1FE00}-\u{1FE23}]|[\u{1FE30}-\u{1FE56}]|[\u{1FE60}-\u{1FE78}]|[\u{1FE80}-\u{1FE9C}]|[\u{1FEA0}-\u{1FEA4}]|[\u{1FEB0}-\u{1FEB4}]|[\u{1FEC0}-\u{1FEC4}]|[\u{1FED0}-\u{1FED4}]|[\u{1FEE0}-\u{1FEE4}]|[\u{1FEF0}-\u{1FEF4}]|[\u{1FF00}-\u{1FF23}]|[\u{1FF30}-\u{1FF56}]|[\u{1FF60}-\u{1FF78}]|[\u{1FF80}-\u{1FF9C}]|[\u{1FFA0}-\u{1FFA4}]|[\u{1FFB0}-\u{1FFB4}]|[\u{1FFC0}-\u{1FFC4}]|[\u{1FFD0}-\u{1FFD4}]|[\u{1FFE0}-\u{1FFE4}]|[\u{1FFF0}-\u{1FFF4}]|[\u{2000}-\u{206F}]|[\u{2070}-\u{209F}]|[\u{20A0}-\u{20CF}]|[\u{20D0}-\u{20FF}]|[\u{2100}-\u{214F}]|[\u{2150}-\u{218F}]|[\u{2190}-\u{21FF}]|[\u{2200}-\u{22FF}]|[\u{2300}-\u{23FF}]|[\u{2400}-\u{243F}]|[\u{2440}-\u{245F}]|[\u{2460}-\u{24FF}]|[\u{2500}-\u{257F}]|[\u{2580}-\u{259F}]|[\u{25A0}-\u{25FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{27C0}-\u{27EF}]|[\u{27F0}-\u{27FF}]|[\u{2800}-\u{28FF}]|[\u{2900}-\u{297F}]|[\u{2980}-\u{29FF}]|[\u{2A00}-\u{2AFF}]|[\u{2B00}-\u{2BFF}]|[\u{2C00}-\u{2C5F}]|[\u{2C60}-\u{2C7F}]|[\u{2C80}-\u{2CFF}]|[\u{2D00}-\u{2D2F}]|[\u{2D30}-\u{2D7F}]|[\u{2D80}-\u{2DDF}]|[\u{2DE0}-\u{2DFF}]|[\u{2E00}-\u{2E7F}]|[\u{2E80}-\u{2EFF}]|[\u{2F00}-\u{2FDF}]|[\u{2FF0}-\u{2FFF}]|[\u{3000}-\u{303F}]|[\u{3040}-\u{309F}]|[\u{30A0}-\u{30FF}]|[\u{3100}-\u{312F}]|[\u{3130}-\u{318F}]|[\u{3190}-\u{319F}]|[\u{31A0}-\u{31BF}]|[\u{31C0}-\u{31EF}]|[\u{31F0}-\u{31FF}]|[\u{3200}-\u{32FF}]|[\u{3300}-\u{33FF}]|[\u{3400}-\u{4DBF}]|[\u{4DC0}-\u{4DFF}]|[\u{4E00}-\u{9FFF}]|[\u{A000}-\u{A48F}]|[\u{A490}-\u{A4CF}]|[\u{A4D0}-\u{A4FF}]|[\u{A500}-\u{A63F}]|[\u{A640}-\u{A69F}]|[\u{A6A0}-\u{A6FF}]|[\u{A700}-\u{A71F}]|[\u{A720}-\u{A7FF}]|[\u{A800}-\u{A82F}]|[\u{A830}-\u{A83F}]|[\u{A840}-\u{A87F}]|[\u{A880}-\u{A8DF}]|[\u{A8E0}-\u{A8FF}]|[\u{A900}-\u{A92F}]|[\u{A930}-\u{A95F}]|[\u{A960}-\u{A97F}]|[\u{A980}-\u{A9DF}]|[\u{A9E0}-\u{A9FF}]|[\u{AA00}-\u{AA5F}]|[\u{AA60}-\u{AA7F}]|[\u{AA80}-\u{AADF}]|[\u{AAE0}-\u{AAFF}]|[\u{AB00}-\u{AB2F}]|[\u{AB30}-\u{AB6F}]|[\u{AB70}-\u{ABBF}]|[\u{ABC0}-\u{ABFF}]|[\u{AC00}-\u{D7AF}]|[\u{D7B0}-\u{D7FF}]|[\u{D800}-\u{DB7F}]|[\u{DB80}-\u{DBFF}]|[\u{DC00}-\u{DFFF}]|[\u{E000}-\u{F8FF}]|[\u{F900}-\u{FAFF}]|[\u{FB00}-\u{FB4F}]|[\u{FB50}-\u{FDFF}]|[\u{FE00}-\u{FE0F}]|[\u{FE10}-\u{FE1F}]|[\u{FE20}-\u{FE2F}]|[\u{FE30}-\u{FE4F}]|[\u{FE50}-\u{FE6F}]|[\u{FE70}-\u{FEFF}]|[\u{FF00}-\u{FFEF}]|[\u{FFF0}-\u{FFFF}]|[\u{1B000}-\u{1B0FF}]|[\u{1B100}-\u{1B12F}]|[\u{1B130}-\u{1B16F}]|[\u{1B170}-\u{1B2FF}]|[\u{1B300}-\u{1B77F}]|[\u{1B780}-\u{1B7FF}]|[\u{1B800}-\u{1B8FF}]|[\u{1B900}-\u{1B9FF}]|[\u{1BA00}-\u{1BA6F}]|[\u{1BA70}-\u{1BAFF}]|[\u{1BB00}-\u{1BB6F}]|[\u{1BB70}-\u{1BBFF}]|[\u{1BC00}-\u{1BC9F}]|[\u{1BCA0}-\u{1BCAF}]|[\u{1BCB0}-\u{1BCFF}]|[\u{1BD00}-\u{1BD3F}]|[\u{1BD40}-\u{1BD7F}]|[\u{1BD80}-\u{1BDFF}]|[\u{1BE00}-\u{1BE6F}]|[\u{1BE70}-\u{1BEFF}]|[\u{1BF00}-\u{1BFFF}]|[\u{1C000}-\u{1C0FF}]|[\u{1C100}-\u{1C1FF}]|[\u{1C200}-\u{1C2FF}]|[\u{1C300}-\u{1C3FF}]|[\u{1C400}-\u{1C4FF}]|[\u{1C500}-\u{1C5FF}]|[\u{1C600}-\u{1C6FF}]|[\u{1C700}-\u{1C7FF}]|[\u{1C800}-\u{1C8FF}]|[\u{1C900}-\u{1C9FF}]|[\u{1CA00}-\u{1CAFF}]|[\u{1CB00}-\u{1CBFF}]|[\u{1CC00}-\u{1CCFF}]|[\u{1CD00}-\u{1CDFF}]|[\u{1CE00}-\u{1CEFF}]|[\u{1CF00}-\u{1CFFF}]|[\u{1D000}-\u{1D0FF}]|[\u{1D100}-\u{1D1FF}]|[\u{1D200}-\u{1D2FF}]|[\u{1D300}-\u{1D3FF}]|[\u{1D400}-\u{1D4FF}]|[\u{1D500}-\u{1D5FF}]|[\u{1D600}-\u{1D6FF}]|[\u{1D700}-\u{1D7FF}]|[\u{1D800}-\u{1D8FF}]|[\u{1D900}-\u{1D9FF}]|[\u{1DA00}-\u{1DAFF}]|[\u{1DB00}-\u{1DBFF}]|[\u{1DC00}-\u{1DFFF}]|[\u{1E000}-\u{1E02F}]|[\u{1E030}-\u{1E04F}]|[\u{1E050}-\u{1E06F}]|[\u{1E070}-\u{1E08F}]|[\u{1E090}-\u{1E0AF}]|[\u{1E0B0}-\u{1E0CF}]|[\u{1E0D0}-\u{1E0EF}]|[\u{1E0F0}-\u{1E0FF}]|[\u{1E100}-\u{1E12F}]|[\u{1E130}-\u{1E14F}]|[\u{1E150}-\u{1E16F}]|[\u{1E170}-\u{1E18F}]|[\u{1E190}-\u{1E1AF}]|[\u{1E1B0}-\u{1E1CF}]|[\u{1E1D0}-\u{1E1EF}]|[\u{1E1F0}-\u{1E1FF}]|[\u{1E200}-\u{1E22F}]|[\u{1E230}-\u{1E24F}]|[\u{1E250}-\u{1E26F}]|[\u{1E270}-\u{1E28F}]|[\u{1E290}-\u{1E2AF}]|[\u{1E2B0}-\u{1E2CF}]|[\u{1E2D0}-\u{1E2EF}]|[\u{1E2F0}-\u{1E2FF}]|[\u{1E300}-\u{1E32F}]|[\u{1E330}-\u{1E34F}]|[\u{1E350}-\u{1E36F}]|[\u{1E370}-\u{1E38F}]|[\u{1E390}-\u{1E3AF}]|[\u{1E3B0}-\u{1E3CF}]|[\u{1E3D0}-\u{1E3EF}]|[\u{1E3F0}-\u{1E3FF}]|[\u{1E400}-\u{1E42F}]|[\u{1E430}-\u{1E44F}]|[\u{1E450}-\u{1E46F}]|[\u{1E470}-\u{1E48F}]|[\u{1E490}-\u{1E4AF}]|[\u{1E4B0}-\u{1E4CF}]|[\u{1E4D0}-\u{1E4EF}]|[\u{1E4F0}-\u{1E4FF}]|[\u{1E500}-\u{1E52F}]|[\u{1E530}-\u{1E54F}]|[\u{1E550}-\u{1E56F}]|[\u{1E570}-\u{1E58F}]|[\u{1E590}-\u{1E5AF}]|[\u{1E5B0}-\u{1E5CF}]|[\u{1E5D0}-\u{1E5EF}]|[\u{1E5F0}-\u{1E5FF}]|[\u{1E600}-\u{1E62F}]|[\u{1E630}-\u{1E64F}]|[\u{1E650}-\u{1E66F}]|[\u{1E670}-\u{1E68F}]|[\u{1E690}-\u{1E6AF}]|[\u{1E6B0}-\u{1E6CF}]|[\u{1E6D0}-\u{1E6EF}]|[\u{1E6F0}-\u{1E6FF}]|[\u{1E700}-\u{1E72F}]|[\u{1E730}-\u{1E74F}]|[\u{1E750}-\u{1E76F}]|[\u{1E770}-\u{1E78F}]|[\u{1E790}-\u{1E7AF}]|[\u{1E7B0}-\u{1E7CF}]|[\u{1E7D0}-\u{1E7EF}]|[\u{1E7F0}-\u{1E7FF}]|[\u{1E800}-\u{1E82F}]|[\u{1E830}-\u{1E84F}]|[\u{1E850}-\u{1E86F}]|[\u{1E870}-\u{1E88F}]|[\u{1E890}-\u{1E8AF}]|[\u{1E8B0}-\u{1E8CF}]|[\u{1E8D0}-\u{1E8EF}]|[\u{1E8F0}-\u{1E8FF}]|[\u{1E900}-\u{1E92F}]|[\u{1E930}-\u{1E94F}]|[\u{1E950}-\u{1E96F}]|[\u{1E970}-\u{1E98F}]|[\u{1E990}-\u{1E9AF}]|[\u{1E9B0}-\u{1E9CF}]|[\u{1E9D0}-\u{1E9EF}]|[\u{1E9F0}-\u{1E9FF}]|[\u{1EA00}-\u{1EA2F}]|[\u{1EA30}-\u{1EA4F}]|[\u{1EA50}-\u{1EA6F}]|[\u{1EA70}-\u{1EA8F}]|[\u{1EA90}-\u{1EAAF}]|[\u{1EAB0}-\u{1EACF}]|[\u{1EAD0}-\u{1FAEF}]|[\u{1FAF0}-\u{1FAFF}]|[\u{1FB00}-\u{1FB4B}]|[\u{1FB50}-\u{1FBAF}]|[\u{1FBB0}-\u{1FBCA}]|[\u{1FBD0}-\u{1FBEF}]|[\u{1FBF0}-\u{1FBFF}]|[\u{1FC00}-\u{1FC23}]|[\u{1FC30}-\u{1FC56}]|[\u{1FC60}-\u{1FC78}]|[\u{1FC80}-\u{1FC9C}]|[\u{1FCA0}-\u{1FCA4}]|[\u{1FCC0}-\u{1FCC4}]|[\u{1FCD0}-\u{1FCD4}]|[\u{1FCE0}-\u{1FCE4}]|[\u{1FCF0}-\u{1FCF4}]|[\u{1FD00}-\u{1FD23}]|[\u{1FD30}-\u{1FD56}]|[\u{1FD60}-\u{1FD78}]|[\u{1FD80}-\u{1FD9C}]|[\u{1FDA0}-\u{1FDA4}]|[\u{1FDB0}-\u{1FDB4}]|[\u{1FDC0}-\u{1FDC4}]|[\u{1FDD0}-\u{1FDD4}]|[\u{1FDE0}-\u{1FDE4}]|[\u{1FDF0}-\u{1FDF4}]|[\u{1FE00}-\u{1FE23}]|[\u{1FE30}-\u{1FE56}]|[\u{1FE60}-\u{1FE78}]|[\u{1FE80}-\u{1FE9C}]|[\u{1FEA0}-\u{1FEA4}]|[\u{1FEB0}-\u{1FEB4}]|[\u{1FEC0}-\u{1FEC4}]|[\u{1FED0}-\u{1FED4}]|[\u{1FEE0}-\u{1FEE4}]|[\u{1FEF0}-\u{1FEF4}]|[\u{1FF00}-\u{1FF23}]|[\u{1FF30}-\u{1FF56}]|[\u{1FF60}-\u{1FF78}]|[\u{1FF80}-\u{1FF9C}]|[\u{1FFA0}-\u{1FFA4}]|[\u{1FFB0}-\u{1FFB4}]|[\u{1FFC0}-\u{1FFC4}]|[\u{1FFD0}-\u{1FFD4}]|[\u{1FFE0}-\u{1FFE4}]|[\u{1FFF0}-\u{1FFF4}]/gu;

/**
 * Filters out emojis from a string
 * @param text - The input text that may contain emojis
 * @returns The text with all emojis removed
 */
export const filterEmojis = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(EMOJI_REGEX, '');
};

/**
 * Checks if a string contains any emojis
 * @param text - The input text to check
 * @returns True if the text contains emojis, false otherwise
 */
export const containsEmojis = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  return EMOJI_REGEX.test(text);
};

/**
 * Event handler for input changes that automatically filters out emojis
 * @param e - The change event from an input element
 * @param setter - The state setter function
 * @returns The filtered value without emojis
 */
export const handleInputChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
): string => {
  const filteredValue = filterEmojis(e.target.value);
  setter(filteredValue);
  return filteredValue;
};

/**
 * Event handler for paste events that filters out emojis
 * @param e - The clipboard event
 * @param setter - The state setter function
 * @returns The filtered value without emojis
 */
export const handlePaste = (
  e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  setter: (value: string) => void
): string => {
  // Prevent the default paste behavior to avoid duplication
  e.preventDefault();
  
  const pastedText = e.clipboardData.getData('text');
  const filteredValue = filterEmojis(pastedText);
  
  // Set the value directly to the input element
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  target.value = filteredValue;
  
  // Update the state
  setter(filteredValue);
  
  // Trigger a change event to ensure React state is in sync
  target.dispatchEvent(new Event('input', { bubbles: true }));
  
  return filteredValue;
};

/**
 * Event handler for keydown events that prevents emoji input
 * @param e - The keyboard event
 * @returns True if the key should be allowed, false if it's an emoji
 */
export const handleKeyDown = (e: React.KeyboardEvent): boolean => {
  // Allow common keys like backspace, delete, arrows, etc.
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft' || 
      e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape' ||
      e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown') {
    return true;
  }
  
  // Check if the key combination would result in an emoji
  const key = e.key;
  if (key.length === 1 && EMOJI_REGEX.test(key)) {
    e.preventDefault();
    return false;
  }
  
  return true;
};
