import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import apiV1Routes from './index.js';
import CapabilityRegistryService from '../../services/CapabilityRegistryService.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', apiV1Routes);
  return app;
}

describe('api v1 public contract', () => {
  it('serves OpenAPI docs in the normalized envelope', async () => {
    const response = await request(buildApp())
      .get('/api/v1/openapi.json')
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.error).toBeNull();
    expect(response.body.requestId).toBeTruthy();
    expect(response.body.data.openapi).toBe('3.1.0');
    expect(response.body.data.paths['/actions/preview']).toBeTruthy();
    expect(response.body.data.paths['/actions/{id}']).toBeTruthy();
    expect(response.body.data.paths['/tasks/{id}/automation']).toBeTruthy();
    expect(response.body.data.paths['/tasks/{id}/automation/preparations/{preparationId}/preview']).toBeTruthy();
  });

  it('marks functions unavailable when the actor lacks their scope', () => {
    const functions = CapabilityRegistryService.listFunctions(['projects:read']);
    const listProjects = functions.find(fn => fn.name === 'projects.list');
    const createProject = functions.find(fn => fn.name === 'projects.create');
    const bootstrapProject = functions.find(fn => fn.name === 'projects.bootstrap');

    expect(listProjects.available).toBe(true);
    expect(createProject.available).toBe(false);
    expect(bootstrapProject.available).toBe(false);
  });

  it('exposes projects.bootstrap when the actor has projects:write', () => {
    const functions = CapabilityRegistryService.listFunctions(['projects:write']);
    const bootstrapProject = functions.find(fn => fn.name === 'projects.bootstrap');

    expect(bootstrapProject).toBeTruthy();
    expect(bootstrapProject.available).toBe(true);
    expect(bootstrapProject.async).toBe(true);
    expect(bootstrapProject.inputSchema.required).toEqual(['name', 'description', 'outcomeStatement']);
  });

  it('exposes task automation execution as a confirmation-gated capability', () => {
    const functions = CapabilityRegistryService.listFunctions(['automation:write']);
    const runTaskAutomation = functions.find(fn => fn.name === 'tasks.run_automation');

    expect(runTaskAutomation).toBeTruthy();
    expect(runTaskAutomation.available).toBe(true);
    expect(runTaskAutomation.confirmationRequired).toBe(true);
    expect(runTaskAutomation.inputSchema.required).toEqual(['taskId', 'preparationId', 'capabilityName']);
  });
});
