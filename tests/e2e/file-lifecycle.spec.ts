import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { MAX_FILE_SIZE_BYTES } from "@/config/file-policy";

const password = "E2e-password-123";
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const ownerEmail = `stow-e2e-owner-${runId}@example.com`;
const granteeEmail = `stow-e2e-grantee-${runId}@example.com`;
const fileName = `sample-${runId}.pdf`;

async function register(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByLabel("Повторіть пароль").fill(password);
  await page.getByRole("button", { name: "Створити акаунт" }).click();
  await expect(page).toHaveURL(/\/files$/);
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page).toHaveURL(/\/files$/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Вийти" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test("owner can upload, share, revoke and delete a private file", async ({
  page,
}) => {
  await register(page, ownerEmail);
  const fixture = await readFile(
    path.join(process.cwd(), "tests/e2e/fixtures/sample.pdf"),
  );
  const oversizedReservation = await page.request.post("/api/uploads", {
    data: {
      originalName: "oversized.pdf",
      declaredMime: "application/pdf",
      declaredSize: MAX_FILE_SIZE_BYTES + 1,
    },
    headers: {
      Origin: "http://localhost:3000",
      "X-Stow-Request": "1",
    },
  });
  expect(oversizedReservation.status()).toBe(400);

  await page.locator("#file-upload").setInputFiles({
    name: `mismatched-${runId}.png`,
    mimeType: "image/png",
    buffer: fixture,
  });
  await page.getByRole("button", { name: "Завантажити", exact: true }).click();
  await expect(
    page.getByText("Вміст файлу не відповідає дозволеному формату."),
  ).toBeVisible();

  await page.locator("#file-upload").setInputFiles({
    name: fileName,
    mimeType: "application/pdf",
    buffer: fixture,
  });
  await page.getByRole("button", { name: "Завантажити", exact: true }).click();
  await expect(page.getByText(`«${fileName}» успішно завантажено.`)).toBeVisible();

  let fileRow = page.getByRole("listitem").filter({ hasText: fileName });
  await expect(fileRow).toBeVisible();
  await fileRow.getByRole("button", { name: "Поділитися" }).click();

  const shareDialog = page.getByRole("dialog", { name: "Доступ до файла" });
  await shareDialog.getByLabel("Email отримувача").fill(granteeEmail);
  await shareDialog.getByRole("button", { name: "Надати доступ" }).click();
  await expect(shareDialog.getByText(granteeEmail)).toBeVisible();
  await shareDialog.getByRole("button", { name: "Закрити" }).click();
  await logout(page);

  await register(page, granteeEmail);
  fileRow = page.getByRole("listitem").filter({ hasText: fileName });
  await expect(fileRow.getByText("Поділилися з вами")).toBeVisible();
  await expect(
    fileRow.getByRole("button", { name: "Поділитися" }),
  ).toHaveCount(0);
  await expect(fileRow.getByRole("button", { name: "Видалити" })).toHaveCount(0);

  const listResponse = await page.request.get("/api/files?page=1&pageSize=25");
  const listPayload = (await listResponse.json()) as {
    items: Array<{ id: string; originalName: string }>;
  };
  const sharedFile = listPayload.items.find(
    (item) => item.originalName === fileName,
  );

  expect(sharedFile).toBeTruthy();
  const mutationHeaders = {
    Origin: "http://localhost:3000",
    "X-Stow-Request": "1",
  };
  const forbiddenDelete = await page.request.delete(
    `/api/files/${sharedFile!.id}`,
    { headers: mutationHeaders },
  );
  expect(forbiddenDelete.status()).toBe(404);

  const forbiddenShare = await page.request.post(
    `/api/files/${sharedFile!.id}/shares`,
    {
      data: { email: `other-${runId}@example.com` },
      headers: mutationHeaders,
    },
  );
  expect(forbiddenShare.status()).toBe(404);

  const forbiddenRevoke = await page.request.delete(
    `/api/files/${sharedFile!.id}/shares/44444444-4444-4444-8444-444444444444`,
    { headers: mutationHeaders },
  );
  expect(forbiddenRevoke.status()).toBe(404);

  const downloadPromise = page.waitForEvent("download");
  await fileRow.getByRole("button", { name: "Скачати" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(fileName);
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  await expect(readFile(downloadedPath!)).resolves.toEqual(fixture);
  await logout(page);

  await login(page, ownerEmail);
  fileRow = page.getByRole("listitem").filter({ hasText: fileName });
  await fileRow.getByRole("button", { name: "Поділитися" }).click();
  await shareDialog.getByRole("button", { name: "Скасувати" }).click();
  await expect(shareDialog.getByText(granteeEmail)).toHaveCount(0);
  await shareDialog.getByRole("button", { name: "Закрити" }).click();
  await logout(page);

  await login(page, granteeEmail);
  await expect(page.getByText(fileName)).toHaveCount(0);
  await logout(page);

  await login(page, ownerEmail);
  fileRow = page.getByRole("listitem").filter({ hasText: fileName });
  page.once("dialog", (dialog) => dialog.accept());
  await fileRow.getByRole("button", { name: "Видалити" }).click();
  await expect(fileRow).toHaveCount(0);
});
