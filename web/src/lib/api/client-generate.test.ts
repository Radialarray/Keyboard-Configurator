import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiClient } from './client';
import type { GenerateJob, GenerateJobStatus } from './types';

// Mock fetch
global.fetch = vi.fn();

describe('ApiClient Generate Job Operations', () => {
	let client: ApiClient;

	beforeEach(() => {
		client = new ApiClient('http://localhost:3000');
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('generateFirmware', () => {
		it('starts a generate job and returns job info', async () => {
			const mockJob: GenerateJob = {
				id: 'gen-123',
				status: 'pending',
				layout_filename: 'test.md',
				keyboard: 'crkbd',
				layout_variant: 'LAYOUT_split_3x6_3',
				created_at: '2024-01-01T00:00:00Z',
				progress: 0,
				download_url: '/api/generate/jobs/gen-123/download'
			};
			const mockResponse = {
				status: 'queued',
				message: 'Generation job started',
				job: mockJob
			};
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await client.generateFirmware('test.md');
			expect(result).toEqual(mockResponse);
			expect(result.job.id).toBe('gen-123');
			expect(result.job.status).toBe('pending');
			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:3000/api/layouts/test.md/generate',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});
	});

	describe('polling workflow simulation', () => {
		it('can poll job status until completion', async () => {
			const jobId = 'gen-123';
			
			// Mock sequence: pending -> running -> completed
			const pendingJob: GenerateJob = {
				id: jobId,
				status: 'pending',
				layout_filename: 'test.md',
				keyboard: 'crkbd',
				layout_variant: 'LAYOUT_split_3x6_3',
				created_at: '2024-01-01T00:00:00Z',
				progress: 0
			};
			
			const runningJob: GenerateJob = {
				...pendingJob,
				status: 'running',
				started_at: '2024-01-01T00:00:01Z',
				progress: 50
			};
			
			const completedJob: GenerateJob = {
				...runningJob,
				status: 'completed',
				completed_at: '2024-01-01T00:00:10Z',
				progress: 100,
				download_url: '/api/generate/jobs/gen-123/download'
			};

			// First poll - pending
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ job: pendingJob })
			});
			
			let result = await client.getGenerateJob(jobId);
			expect(result.job.status).toBe('pending');

			// Second poll - running
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ job: runningJob })
			});
			
			result = await client.getGenerateJob(jobId);
			expect(result.job.status).toBe('running');
			expect(result.job.progress).toBe(50);

			// Third poll - completed
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ job: completedJob })
			});
			
			result = await client.getGenerateJob(jobId);
			expect(result.job.status).toBe('completed');
			expect(result.job.progress).toBe(100);
			expect(result.job.download_url).toBeDefined();
		});

		it('can fetch logs incrementally', async () => {
			const jobId = 'gen-123';
			
			// First batch of logs
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					job_id: jobId,
					logs: [
						{ timestamp: '2024-01-01T00:00:00Z', level: 'INFO', message: 'Starting generation' },
						{ timestamp: '2024-01-01T00:00:01Z', level: 'INFO', message: 'Loading layout' }
					],
					has_more: true
				})
			});
			
			let logs = await client.getGenerateLogs(jobId, 0, 10);
			expect(logs.logs).toHaveLength(2);
			expect(logs.has_more).toBe(true);

			// Second batch (offset to get new logs)
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					job_id: jobId,
					logs: [
						{ timestamp: '2024-01-01T00:00:02Z', level: 'INFO', message: 'Generating keymap.c' },
						{ timestamp: '2024-01-01T00:00:03Z', level: 'INFO', message: 'Complete!' }
					],
					has_more: false
				})
			});
			
			logs = await client.getGenerateLogs(jobId, 2, 10);
			expect(logs.logs).toHaveLength(2);
			expect(logs.has_more).toBe(false);
		});

		it('can cancel a running job', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true, message: 'Job cancelled' })
			});

			const result = await client.cancelGenerate('gen-123');
			expect(result.success).toBe(true);
			expect(global.fetch).toHaveBeenCalledWith(
				'http://localhost:3000/api/generate/jobs/gen-123/cancel',
				expect.objectContaining({ method: 'POST' })
			);
		});

		it('handles failed job status', async () => {
			const failedJob: GenerateJob = {
				id: 'gen-123',
				status: 'failed',
				layout_filename: 'test.md',
				keyboard: 'crkbd',
				layout_variant: 'LAYOUT_split_3x6_3',
				created_at: '2024-01-01T00:00:00Z',
				progress: 30,
				error: 'Failed to find keyboard configuration'
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ job: failedJob })
			});

			const result = await client.getGenerateJob('gen-123');
			expect(result.job.status).toBe('failed');
			expect(result.job.error).toBe('Failed to find keyboard configuration');
		});
	});

	describe('terminal state detection', () => {
		const terminalStates: GenerateJobStatus[] = ['completed', 'failed', 'cancelled'];
		const nonTerminalStates: GenerateJobStatus[] = ['pending', 'running'];

		it.each(terminalStates)('recognizes %s as terminal state', (status) => {
			expect(terminalStates.includes(status)).toBe(true);
		});

		it.each(nonTerminalStates)('recognizes %s as non-terminal state', (status) => {
			expect(terminalStates.includes(status)).toBe(false);
		});
	});

	describe('getGenerateDownloadUrl', () => {
		it('constructs correct download URL', () => {
			const url = client.getGenerateDownloadUrl('gen-abc-123');
			expect(url).toBe('http://localhost:3000/api/generate/jobs/gen-abc-123/download');
		});

		it('handles special characters in job ID', () => {
			const url = client.getGenerateDownloadUrl('job/with/slashes');
			expect(url).toBe('http://localhost:3000/api/generate/jobs/job%2Fwith%2Fslashes/download');
		});
	});
});
