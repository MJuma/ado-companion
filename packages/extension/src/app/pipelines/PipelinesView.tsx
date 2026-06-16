import { For, Show } from 'solid-js';

import type { PrPipeline } from '../../lib/ado/pipelines';

import { StatusDot } from './StatusDot';

interface PipelinesViewProps {
    loading: boolean;
    error: boolean;
    refreshing: boolean;
    pipelines: PrPipeline[];
    /** `${organizationUrl}/${project}` — base for the build-results deep links. */
    projectUrl: string;
    /** Relative time since the last successful load, e.g. "30s ago" (or null). */
    updatedAgo: string | null;
    onRefresh: () => void;
}

function resultsUrl(projectUrl: string, buildId: number): string {
    return `${projectUrl}/_build/results?buildId=${buildId}&view=results`;
}

function jobUrl(projectUrl: string, buildId: number, jobId: string): string {
    return `${projectUrl}/_build/results?buildId=${buildId}&view=logs&j=${jobId}`;
}

/** The Pipelines tab content: each pipeline's stages, with job status circles. */
export function PipelinesView(props: PipelinesViewProps) {
    return (
        <div class="pl">
            <Show
                when={!props.loading}
                fallback={<p class="pl__msg">Loading pipeline status…</p>}
            >
                <Show
                    when={!props.error}
                    fallback={
                        <p class="pl__msg pl__msg--error">
                            Couldn’t load pipeline status for this pull request.
                        </p>
                    }
                >
                    <Show
                        when={props.pipelines.length > 0}
                        fallback={<p class="pl__msg">No pipeline runs for this pull request.</p>}
                    >
                        <div class="pl__toolbar">
                            <button
                                class="pl__refresh"
                                type="button"
                                disabled={props.refreshing}
                                on:click={() => props.onRefresh()}
                            >
                                {props.refreshing ? 'Refreshing…' : 'Refresh'}
                            </button>
                            <Show when={props.updatedAgo}>
                                <span class="pl__updated">Updated {props.updatedAgo}</span>
                            </Show>
                        </div>
                        <For each={props.pipelines}>
                            {(pipeline) => (
                                <section class="pl__build">
                                    <header class="pl__build-head">
                                        <h3 class="pl__build-title">{pipeline.name}</h3>
                                        <a
                                            class="pl__build-link"
                                            href={resultsUrl(props.projectUrl, pipeline.buildId)}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open in Pipelines
                                        </a>
                                    </header>
                                    <Show
                                        when={pipeline.stages.length > 0}
                                        fallback={<p class="pl__msg">No stages reported.</p>}
                                    >
                                        <For each={pipeline.stages}>
                                            {(stage) => (
                                                <div class="pl__stage">
                                                    <div class="pl__stage-head">
                                                        <StatusDot
                                                            status={stage.status}
                                                            label={stage.name}
                                                            href={resultsUrl(
                                                                props.projectUrl,
                                                                pipeline.buildId,
                                                            )}
                                                        />
                                                        <span class="pl__stage-name">
                                                            {stage.name}
                                                        </span>
                                                        <Show when={stage.jobs.length > 0}>
                                                            <span class="pl__stage-count">
                                                                {stage.jobs.length}
                                                            </span>
                                                        </Show>
                                                    </div>
                                                    <Show when={stage.jobs.length > 0}>
                                                        <div class="pl__jobs">
                                                            <For each={stage.jobs}>
                                                                {(job) => (
                                                                    <StatusDot
                                                                        status={job.status}
                                                                        label={job.name}
                                                                        href={jobUrl(
                                                                            props.projectUrl,
                                                                            pipeline.buildId,
                                                                            job.id,
                                                                        )}
                                                                    />
                                                                )}
                                                            </For>
                                                        </div>
                                                    </Show>
                                                </div>
                                            )}
                                        </For>
                                    </Show>
                                </section>
                            )}
                        </For>
                    </Show>
                </Show>
            </Show>
        </div>
    );
}
