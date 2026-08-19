const { chromium } = require("../backend/node_modules/playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  const html = path.resolve(__dirname, "erd-ppt.html");
  const outDir = path.resolve(__dirname, "..");
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });
  await page.goto("file:///" + html.replace(/\\/g, "/"), {
    waitUntil: "networkidle",
  });
  await page.addStyleTag({
    content: "body { margin: 0; } .slide { margin: 0; }",
  });

  const shots = [
    ["slide-consult", "erd-consult.png"],
    ["slide-gov", "erd-gov.png"],
  ];
  for (const [id, file] of shots) {
    await page.evaluate((keep) => {
      document.querySelectorAll(".slide").forEach((el) => {
        el.style.display = el.id === keep ? "block" : "none";
      });
    }, id);
    await page.waitForTimeout(150);
    await page.locator("#" + id).screenshot({
      path: path.join(outDir, file),
      type: "png",
    });
  }

  await browser.close();
  console.log(
    "wrote",
    shots.map((s) => path.join(outDir, s[1])).join("\n"),
  );
  if (!fs.existsSync(path.join(outDir, "erd-consult.png"))) {
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
