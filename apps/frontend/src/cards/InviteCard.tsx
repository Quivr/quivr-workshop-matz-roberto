import { useState, type ReactNode } from 'react'

import { useChatActions } from './chat-actions'
import { DemoBadge } from './DemoBadge'
import { initials, shortDate, vars } from './format'
import { NextSteps } from './NextSteps'
import type { NextStep } from './NextSteps'
import type { CardProps } from './types'
import './social-cards.css'

type Invite = {
  demo: true
  note: string
  simulated: true
  status: 'delivered'
  to: string
  when: string
  where: string
  message: string
  reply: string
  photoUrl?: string
}

type InviteArgs = {
  student?: string
  date?: string
  time?: string
  place?: string
  message?: string
}

const HEARTS = [
  { left: 8, dx: -10, rot: -18, delay: 2.75, size: 12, emoji: '❤️' },
  { left: 20, dx: 6, rot: 12, delay: 2.9, size: 10, emoji: '💕' },
  { left: 32, dx: -4, rot: -8, delay: 2.82, size: 14, emoji: '💖' },
  { left: 44, dx: 12, rot: 20, delay: 3.05, size: 11, emoji: '❤️' },
  { left: 56, dx: -8, rot: -14, delay: 2.95, size: 13, emoji: '💗' },
  { left: 68, dx: 8, rot: 10, delay: 3.15, size: 10, emoji: '💕' },
  { left: 78, dx: -6, rot: -20, delay: 3.0, size: 12, emoji: '💖' },
  { left: 88, dx: 10, rot: 16, delay: 3.25, size: 11, emoji: '❤️' },
]

const REPLY_MAX = 80

/** Shortens long text to `max` characters, ending in "…". */
const clip = (text: string, max = REPLY_MAX) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

const deliveredSteps = (invite: Invite): NextStep[] => [
  {
    label: '🗓 Add to my plans',
    message: `Summarise my date with ${invite.to}: when, where and what to bring`,
  },
  ...(invite.reply
    ? [
        {
          label: `💬 Reply to ${invite.to}`,
          message: `Help me reply to ${invite.to}'s message: "${clip(invite.reply)}"`,
        },
      ]
    : []),
  { label: '💘 Find another match', message: 'Find me other matches' },
]

const textOf = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined

const parseArgs = (args: unknown): InviteArgs => {
  const raw = (args ?? {}) as Record<string, unknown>
  return {
    student: textOf(raw.student),
    date: textOf(raw.date),
    time: textOf(raw.time),
    place: textOf(raw.place),
    message: textOf(raw.message),
  }
}

/** "2026-11-19 12:15" → "Thu 19 Nov · 12:15" */
const formatWhen = (date?: string, time?: string) => {
  if (!date) return time
  const isDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T12:00:00Z`))
  const day = isDate ? shortDate(date) : date
  return time ? `${day} · ${time}` : day
}

const splitWhen = (when: string) => {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(when)
  return match ? formatWhen(match[1], match[2]) : when
}

function Avatar({
  name,
  size,
  photoUrl,
}: {
  name: string
  size: 'sm' | 'md'
  photoUrl?: string
}) {
  const [isBroken, setIsBroken] = useState(false)
  const box = size === 'md' ? 'size-9 text-xs' : 'size-6 text-[9px]'
  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-pink-400 via-rose-400 to-orange-300 font-bold text-white shadow-sm ring-2 ring-white`}
    >
      {photoUrl && !isBroken ? (
        <img
          src={photoUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setIsBroken(true)}
        />
      ) : (
        initials(name) || '?'
      )}
    </span>
  )
}

function Phone({
  name,
  note,
  status,
  children,
}: {
  name: string
  note?: string
  status: ReactNode
  children: ReactNode
}) {
  return (
    <figure
      aria-label={`Chat with ${name}`}
      className="mx-auto w-full max-w-[320px] rounded-[30px] bg-zinc-900 p-1.5 shadow-[0_12px_30px_-10px_rgba(190,24,93,0.45)] ring-1 ring-black/40"
    >
      <div className="overflow-hidden rounded-[24px] bg-white">
        <div
          aria-hidden
          className="relative flex items-center justify-between px-5 pt-1.5 pb-1 text-[10px] font-bold text-zinc-800"
        >
          <span>9:41</span>
          <span className="absolute top-1.5 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-zinc-900" />
          <span className="tracking-tighter">▂▄▆ ▮</span>
        </div>

        <header className="flex items-center gap-2.5 border-b border-zinc-100 px-3 py-2">
          <Avatar
            name={name}
            size="md"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate font-bold text-zinc-900">{name}</div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              {status}
            </div>
          </div>
          <DemoBadge note={note} />
        </header>

        {children}
      </div>
    </figure>
  )
}

function EventChip({ where, when }: { where?: string; when?: string }) {
  if (!where && !when) return null
  return (
    <div className="flex justify-center px-3 pt-3">
      <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] text-zinc-600 shadow-sm ring-1 ring-rose-200/70 backdrop-blur">
        {where && (
          <span className="truncate">
            <span aria-label="Where">📍</span> {where}
          </span>
        )}
        {where && when && (
          <span
            aria-hidden
            className="text-rose-300"
          >
            ·
          </span>
        )}
        {when && (
          <span className="shrink-0 tabular-nums">
            <span aria-label="When">🕒</span> {when}
          </span>
        )}
      </div>
    </div>
  )
}

const screen =
  'bg-linear-to-b from-rose-50 via-white to-pink-50/60 pb-4 text-[13px] leading-snug'

function Delivered({ invite }: { invite: Invite }) {
  return (
    <Phone
      name={invite.to}
      note={invite.note}
      status={
        <>
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
          />
          demo · active now
        </>
      }
    >
      <div className={screen}>
        <EventChip
          where={invite.where}
          when={splitWhen(invite.when)}
        />

        <div className="flex flex-col gap-1 px-3 pt-3">
          <div className="flex flex-col items-end">
            <p className="sc-pop max-w-[80%] rounded-2xl rounded-br-md bg-linear-to-br from-pink-500 to-rose-500 px-3 py-2 text-white shadow-[0_4px_14px_-4px_rgba(225,29,72,0.55)]">
              {invite.message}
            </p>
            <span className="sc-delivered mt-0.5 mr-1 text-[10px] text-zinc-400">
              Delivered <span className="text-sky-500">✓✓</span>
            </span>
          </div>

          <div className="relative mt-1 grid">
            <div
              aria-hidden
              className="sc-typing col-start-1 row-start-1 flex items-end gap-1.5 self-end"
            >
              <Avatar
                name={invite.to}
                size="sm"
                photoUrl={invite.photoUrl}
              />
              <span className="flex gap-1 rounded-2xl rounded-bl-md bg-zinc-200/90 px-3 py-2.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="sc-typing-dot size-1.5 rounded-full bg-zinc-500"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>

            <div
              aria-live="polite"
              className="sc-reply col-start-1 row-start-1 flex items-end gap-1.5"
            >
              <Avatar
                name={invite.to}
                size="sm"
                photoUrl={invite.photoUrl}
              />
              <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-zinc-800 shadow-sm ring-1 ring-zinc-200/80">
                <span className="sr-only">{invite.to} replied: </span>
                {invite.reply}
              </p>
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-3"
            >
              {HEARTS.map((heart, i) => (
                <span
                  key={i}
                  className="sc-heart absolute"
                  style={vars({
                    left: `${heart.left}%`,
                    fontSize: heart.size,
                    animationDelay: `${heart.delay}s`,
                    '--sc-dx': `${heart.dx}px`,
                    '--sc-rot': `${heart.rot}deg`,
                  })}
                >
                  {heart.emoji}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="sc-steps-late px-3 pt-1">
          <NextSteps steps={deliveredSteps(invite)} />
        </div>
      </div>
    </Phone>
  )
}

function ConfirmSend({ name }: { name: string }) {
  const { send, canSend } = useChatActions()
  return (
    <div className="sc-confirm mx-3 mt-3">
      <button
        type="button"
        disabled={!canSend}
        onClick={() => send('Yes, send it')}
        aria-label={`Yes, send it to ${name}`}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-pink-500 via-rose-500 to-orange-400 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(225,29,72,0.75)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:shadow-[0_12px_22px_-8px_rgba(225,29,72,0.85)] focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <span aria-hidden>✅</span>
        Yes, send it
      </button>
      <NextSteps
        title="Or"
        steps={[
          {
            label: '✏️ Change the message',
            message: 'I want to change the message first',
          },
        ]}
      />
    </div>
  )
}

function Draft({ args, error }: { args: InviteArgs; error: string }) {
  const waiting = /confirm/i.test(error)
  return (
    <Phone
      name={args.student ?? 'Your match'}
      status={
        <>
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-zinc-300"
          />
          demo · not sent yet
        </>
      }
    >
      <div className={screen}>
        <EventChip
          where={args.place}
          when={formatWhen(args.date, args.time)}
        />

        <div className="flex flex-col items-end gap-1 px-3 pt-3">
          {args.message && (
            <>
              <p className="sc-draft max-w-[80%] rounded-2xl rounded-br-md border-2 border-dashed border-rose-300 bg-rose-50/70 px-3 py-2 text-rose-900">
                <span className="sr-only">Draft: </span>
                {args.message}
              </p>
              <span className="mr-1 text-[10px] text-zinc-400 italic">
                Draft
              </span>
            </>
          )}
        </div>

        <div
          role="status"
          className={`sc-banner mx-3 mt-3 rounded-xl px-3 py-2 text-center text-xs ring-1 ${
            waiting
              ? 'bg-amber-50 text-amber-800 ring-amber-200'
              : 'bg-red-50 text-red-700 ring-red-200'
          }`}
        >
          {waiting ? (
            <>
              <span
                aria-hidden
                className="sc-hourglass"
              >
                ⏳
              </span>{' '}
              Waiting for your OK before sending
            </>
          ) : (
            <>
              <span aria-hidden>⚠️</span> Couldn’t send: {error}
            </>
          )}
        </div>

        {waiting && <ConfirmSend name={args.student ?? 'your match'} />}
      </div>
    </Phone>
  )
}

/** `send_date_invite`: the invite as a mini phone chat, or the draft when it was not sent. */
export function InviteCard({ args, result, error }: CardProps) {
  const invite = result as Invite | undefined
  if (error || !invite) {
    return (
      <Draft
        args={parseArgs(args)}
        error={error ?? 'No reply from the tool.'}
      />
    )
  }
  return <Delivered invite={invite} />
}
