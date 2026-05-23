import {
  Award,
  ArrowUpRight,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Mail,
  Phone,
  Wrench,
} from "lucide-react";
import { ensureProtocol } from "@/lib/utils";
import type { ResumeData } from "@/lib/types";

export function ResumePanel({ resume }: { resume: ResumeData }) {
  return (
    <article className="card border-2 border-transparent hover:border-cyan-500 transition-colors duration-200 p-6 sm:p-8 lg:p-10 fade-up">
      <HeaderBlock resume={resume} />

      {resume.summary && (
        <div className="mt-7 rounded-xl bg-blue-50 border-l-2 border-blue-600 px-4 py-3 text-[13.5px] leading-[1.65] text-slate-500">
          {resume.summary}
        </div>
      )}

      {resume.education.length > 0 && (
        <Section
          label="Education"
          icon={<GraduationCap className="size-3.5" strokeWidth={2.25} />}
        >
          <div className="stagger">
            {resume.education.map((e, i) => (
              <div
                key={i}
                className="row-hover grid grid-cols-[1fr_auto] gap-4 items-baseline"
              >
                <div>
                  <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">
                    {e.institution}
                  </div>
                  <div className="text-[12.5px] text-slate-600 mt-0.5 italic">
                    {e.degree}
                  </div>
                  {e.score && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="smallcaps text-[9px]">Score</span>
                      <span className="font-mono font-semibold">{e.score}</span>
                    </div>
                  )}
                </div>
                {e.year && (
                  <div className="text-[11px] font-mono tabular-nums text-cyan-600 text-right whitespace-nowrap">
                    {e.year}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {resume.experience.length > 0 && (
        <Section
          label="Professional Experience"
          icon={<Briefcase className="size-3.5" strokeWidth={2.25} />}
        >
          <div className="stagger">
            {resume.experience.map((e, i) => (
              <div key={i} className="row-hover grid grid-cols-[1fr_auto] gap-4">
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">
                    {e.role}
                    {e.company && (
                      <span className="text-blue-600 font-medium">
                        {" · "}
                        {e.company}
                      </span>
                    )}
                  </div>
                  {e.description && (
                    <p className="mt-1.5 text-[12.5px] leading-[1.6] text-slate-500">
                      {e.description}
                    </p>
                  )}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-cyan-600 text-right whitespace-nowrap pt-1">
                  <div>{e.start ?? "—"}</div>
                  <div>{e.end ?? "Present"}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {resume.projects.length > 0 && (
        <Section
          label="Projects"
          icon={<FolderGit2 className="size-3.5" strokeWidth={2.25} />}
        >
          <div className="stagger space-y-4">
            {resume.projects.map((p, i) => (
              <div key={i} className="row-hover">
                <div className="grid grid-cols-[1fr_auto] gap-4 items-baseline">
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-semibold text-slate-900 leading-tight inline-flex items-center gap-1.5">
                      {p.url ? (
                        <a
                          href={ensureProtocol(p.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 transition-colors inline-flex items-center gap-1 group"
                        >
                          {p.name}
                          <ArrowUpRight className="size-3 text-blue-600 opacity-70 group-hover:opacity-100 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </a>
                      ) : (
                        p.name
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-1.5 text-[12.5px] leading-[1.6] text-slate-500">
                        {p.description}
                      </p>
                    )}
                    {p.technologies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.technologies.map((t, ti) => (
                          <span
                            key={`${t}-${ti}`}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {p.date && (
                    <div className="text-[11px] font-mono tabular-nums text-cyan-600 text-right whitespace-nowrap pt-1">
                      {p.date}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {resume.achievements.length > 0 && (
        <Section
          label="Achievements & Awards"
          icon={<Award className="size-3.5" strokeWidth={2.25} />}
        >
          <div className="stagger">
            {resume.achievements.map((a, i) => (
              <div
                key={i}
                className="row-hover grid grid-cols-[1fr_auto] gap-4 items-baseline"
              >
                <div>
                  <div className="text-[14px] font-semibold text-slate-900 leading-tight">
                    {a.title}
                  </div>
                  {a.description && (
                    <p className="mt-1 text-[12.5px] leading-[1.6] text-slate-500">
                      {a.description}
                    </p>
                  )}
                </div>
                {a.date && (
                  <div className="text-[11px] font-mono tabular-nums text-cyan-600 text-right whitespace-nowrap">
                    {a.date}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {resume.skills.length > 0 && (
        <Section
          label="Technical Expertise"
          icon={<Wrench className="size-3.5" strokeWidth={2.25} />}
        >
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 sm:p-5">
            <div className="space-y-4 stagger">
              {resume.skills.map((cat, i) => (
                <div key={`${cat.name}-${i}`}>
                  <div className="smallcaps text-[10px] text-blue-700 mb-2">
                    {cat.name}{" "}
                    <span className="font-mono text-slate-400">· {cat.items.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((s, si) => (
                      <span
                        key={`${s}-${si}`}
                        className="text-[12.5px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-default"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}
    </article>
  );
}

function HeaderBlock({ resume }: { resume: ResumeData }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-100">
      <div className="min-w-0">
        <h1
          className="text-[1.95rem] sm:text-[2.2rem] font-extrabold leading-[1.05] uppercase text-sky-500"
          style={{ letterSpacing: "-0.005em" }}
        >
          {resume.name ?? "Unnamed Candidate"}
        </h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
          {resume.email && (
            <a
              href={`mailto:${resume.email}`}
              className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors"
            >
              <Mail className="size-3" /> {resume.email}
            </a>
          )}
          {resume.phone && (
            <a
              href={`tel:${resume.phone}`}
              className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors"
            >
              <Phone className="size-3" /> {resume.phone}
            </a>
          )}
        </div>
      </div>

      {resume.links.length > 0 && (
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          {resume.links.map((l, i) => (
            <a
              key={i}
              href={ensureProtocol(l.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="smallcaps text-[10.5px] inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors group"
            >
              <span>{l.label}</span>
              <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 fade-up">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-blue-600 [&_svg]:size-3.5">{icon}</span>
        <h3 className="smallcaps text-[10.5px] text-blue-600">{label}</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent ml-2" />
      </div>
      {children}
    </section>
  );
}
