type RepairMojibakeOptions = {
  trim?: boolean;
};

const MOJIBAKE_PATTERN = /(Ã.|Â.|Ä.|Å.|Æ.|áº|á»|â€|â€œ|â€|â€“|â€”|â€¦)/;
const VIETNAMESE_CHAR_PATTERN =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g;

const countVietnameseChars = (value: string): number => (value.match(VIETNAMESE_CHAR_PATTERN) || []).length;

export const repairMojibakeText = (value?: string, options: RepairMojibakeOptions = {}): string => {
  const rawInput = value?.toString() || "";
  const input = options.trim ? rawInput.trim() : rawInput;
  if (!input || !MOJIBAKE_PATTERN.test(input)) {
    return input;
  }

  try {
    const bytes = new Uint8Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      bytes[index] = input.charCodeAt(index) & 0xff;
    }

    const decodedRaw = new TextDecoder("utf-8").decode(bytes);
    const decoded = options.trim ? decodedRaw.trim() : decodedRaw;
    if (!decoded || decoded.includes("�")) {
      return input;
    }

    return countVietnameseChars(decoded) >= countVietnameseChars(input) ? decoded : input;
  } catch {
    return input;
  }
};
