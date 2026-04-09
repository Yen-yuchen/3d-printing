import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('3D Model System - Functional Requirement Testing', () => {

  test.beforeEach(async ({ page }) => {
    
    await page.goto(BASE_URL);
  });


  test('1: Should allow uploading OBJ, STL, and GLTF files', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload Model' }).click();
    const fileChooser = await fileChooserPromise;
    
    await fileChooser.setFiles('./tests/fixtures/test-model.obj'); 

    await expect(page.getByText('Upload successful')).toBeVisible();
    await expect(page.locator('canvas.threejs-viewer')).toBeVisible();
  });

  test('2: Should reject invalid file formats', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload Model' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('./tests/fixtures/invalid-doc.pdf'); 

    await expect(page.getByText('Invalid file format. Please upload OBJ, STL, or GLTF.')).toBeVisible();
  });

 
  test('3 & 4: Should save project to DB and fetch history', async ({ page }) => {
    // Intercept API requests and confirm that the front-end actually sends stored data to the back-end database.
    const saveResponsePromise = page.waitForResponse(response => 
      response.url().includes('/api/projects') && response.request().method() === 'POST'
    );

    // Upload files to trigger database save
    await page.getByLabel('Upload File').setInputFiles('./tests/fixtures/test-model.stl');
    
    // Confirm that the backend database returns a successful status code
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(201); // Created

    // Reload the page and test 4: Get historical records from the database
    await page.goto(BASE_URL + '/history');
    await expect(page.getByText('test-model.stl')).toBeVisible();
  });


  test('5,6 & 7: Should apply perforation/lattice and visualize it', async ({ page }) => {
    // Preparatory work: upload a model first
    await page.getByLabel('Upload File').setInputFiles('./tests/fixtures/test-model.gltf');
    await expect(page.locator('canvas.threejs-viewer')).toBeVisible();

    // 5 & 6: Click the Generate button
    await page.getByRole('button', { name: 'Apply Perforation' }).click();
    await page.getByRole('button', { name: 'Generate Lattice' }).click();

    
    await expect(page.locator('.loading-spinner')).toBeVisible();
    await expect(page.locator('.loading-spinner')).toBeHidden({ timeout: 15000 }); 

    // 7: Verify that the UI status has been updated to "Applied" and Canvas has not crashed
    await expect(page.getByText('Generation Applied Successfully')).toBeVisible();
    
    const canvas = page.locator('canvas.threejs-viewer');
    await expect(canvas).toHaveAttribute('data-render-state', 'lattice-applied');
  });

 
  test('FR-08 & FR-09: Should export the processed model as STL', async ({ page }) => {
//Assume that there is already a processed model on the screen    
    await page.goto(BASE_URL + '/project/mock-id'); 

//Listen to the browser's download event    
    const downloadPromise = page.waitForEvent('download');
    
    // Select the export format and click Download
    await page.locator('select#export-format').selectOption('STL');
    await page.getByRole('button', { name: 'Export Model' }).click();
    
    const download = await downloadPromise;

    // Verify that the downloaded file name and file extension are correct
    expect(download.suggestedFilename()).toMatch(/\.stl$/);
    
    const failureOrError = await download.failure();
    expect(failureOrError).toBeNull();
  });

});