import fs from "fs";
import path from "path";

const filePath = path.resolve("src/data/indian-restaurants.ts");
let content = fs.readFileSync(filePath, "utf8");

let idx = 1;
content = content.replace(/\{\s*title:\s*\"/g, () => {
  const id = "10800000-0000-4000-8000-" + String(idx++).padStart(12, "0");
  return `{\n    id: "${id}",\n    title: "`;
});

fs.writeFileSync(filePath, content, "utf8");
console.log(`Successfully assigned UUIDs to ${idx - 1} Indian restaurants in ${filePath}`);
