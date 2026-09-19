import { defineConfig } from "tinacms";

// Tina never touches HTML. It edits JSON in /content; the build regenerates pages.
// A bad edit can produce awkward wording. It cannot produce broken markup.
//
// Field order below is deliberate: the six fields Annie actually needs for
// every post come first (Title, Published, the post itself, Summary, Web
// address, Date). Everything after that is optional -- each one says so
// explicitly and explains what happens automatically if it's left blank.
export default defineConfig({
    branch: process.env.TINA_BRANCH || process.env.CF_PAGES_BRANCH || "main",
    clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID!,
    token: process.env.TINA_TOKEN!,
    build: { outputFolder: "admin", publicFolder: "." },
    media: { tina: { mediaRoot: "media", publicFolder: "." } },
    schema: {
        collections: [
            {
                name: "blog",
                label: "Journal Posts",
                path: "content/blog",
                format: "json",
                // the only collection she may add to or remove from
                ui: {
                    filename: {
                        readonly: false,
                        slugify: (v) =>
                            (v?.title || "post")
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/^-|-$/g, "")
                                .slice(0, 60),
                    },
                },
                fields: [
                    {
                        type: "string", name: "title", label: "Title", isTitle: true, required: true,
                        description:
                            'Shown on the Journal list and used for the page title. Example: "I spent years intellectualizing my problems."',
                    },
                    {
                        type: "boolean", name: "published", label: "Published", required: true,
                        description:
                            "Off removes the post from the site entirely, including its web address. It is not just hidden -- turn this off only when you mean to take the post down.",
                    },
                    {
                        type: "object", name: "content", label: "Write Your Post", list: true, required: true,
                        description:
                            'This is the actual post -- everything below is just settings. Click "+ Post" below to add each part, in order: one block per paragraph, heading, or pull quote. Choose the kind of block from the dropdown; no symbols or formatting codes to remember. A short post might be: Paragraph, Paragraph, Heading, Paragraph, Pull Quote, Paragraph.',
                        templates: [
                            {
                                name: "paragraph",
                                label: "Paragraph",
                                ui: {
                                    itemProps: (item: any) => ({
                                        label: "Paragraph: " + (item?.text ? item.text.slice(0, 50) : "(empty)"),
                                    }),
                                },
                                fields: [
                                    {
                                        type: "string", name: "text", label: "Paragraph text", required: true,
                                        ui: { component: "textarea" },
                                        description:
                                            'A normal paragraph of body text. Example: "I knew every trauma. Every trigger. I could even tell you why I did the things I did."',
                                    },
                                ],
                            },
                            {
                                name: "heading",
                                label: "Heading",
                                ui: {
                                    itemProps: (item: any) => ({
                                        label: "Heading: " + (item?.text ? item.text : "(empty)"),
                                    }),
                                },
                                fields: [
                                    {
                                        type: "string", name: "text", label: "Heading text", required: true,
                                        description:
                                            'A short section title that breaks up the post. Example: "Insight is not the same as change".',
                                    },
                                ],
                            },
                            {
                                name: "quote",
                                label: "Pull Quote",
                                ui: {
                                    itemProps: (item: any) => ({
                                        label: "Quote: " + (item?.text ? item.text.slice(0, 50) : "(empty)"),
                                    }),
                                },
                                fields: [
                                    {
                                        type: "string", name: "text", label: "Quote text", required: true,
                                        ui: { component: "textarea" },
                                        description:
                                            'A short standout line, shown bigger and styled like a quote. Example: "Who am I when I am no longer performing for belonging?"',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: "string", name: "excerpt", label: "Summary for the Journal list",
                        ui: { component: "textarea" }, required: true,
                        description:
                            "One or two sentences that show on the Journal page under the title. Also used as a fallback everywhere else a short description is needed.",
                    },
                    {
                        type: "string", name: "slug", label: "Web address", required: true,
                        description:
                            'The part after the slash, e.g. "why-rest-feels-unsafe" becomes rootedresonancetherapy.com/why-rest-feels-unsafe. Changing this on a live post breaks existing links, so once a post is published, leave it alone.',
                    },
                    {
                        type: "string", name: "date", label: "Date (YYYY-MM-DD)", required: true,
                        description: 'Example: 2026-09-18. Used to sort posts and build the web address of the sitemap entry.',
                    },
                    {
                        type: "string", name: "dateLabel", label: "Date as written (optional -- skip this)",
                        description:
                            'You do not need to fill this in. Leave it blank and it is generated automatically from the date above, e.g. "September 18, 2026". The site builds and looks right either way.',
                    },
                    {
                        type: "string", name: "author", label: "Author (optional -- skip this)",
                        description:
                            'You do not need to fill this in. Leave it blank and it defaults to "Annie Memmott, LPC". The site builds and looks right either way.',
                    },
                    {
                        type: "string", name: "stage", label: "Framework stage (optional -- skip this)",
                        options: ["Awaken", "Understand", "Reconnect", "Become", "Relate"],
                        description:
                            "You do not need to use this. Leave it unset if the post doesn't relate to one stage of the framework -- the post works exactly the same without one.",
                    },
                    {
                        type: "string", name: "stageLabel", label: "Stage line (optional -- skip this)",
                        description:
                            'You do not need to fill this in. It only matters if you picked a Framework stage above, and even then it is generated automatically, e.g. "Stage II - Understand". The site builds and looks right either way.',
                    },
                    {
                        type: "string", name: "readingTime", label: "Reading time (optional -- skip this)",
                        description:
                            'You do not need to fill this in. Leave it blank and it is estimated automatically from the length of the post, e.g. "4 min". The site builds and looks right either way.',
                    },
                    {
                        type: "string", name: "metaDescription", label: "Search engine description (optional -- skip this)",
                        ui: { component: "textarea" },
                        description:
                            "You do not need to fill this in. Leave it blank and the Summary above is used instead for Google search results. The site builds and looks right either way.",
                    },
                    {
                        type: "string", name: "titleLines", label: "Break the title into lines (optional -- skip this)", list: true,
                        description:
                            "You do not need to use this. Leave it empty and the Title above is shown as-is. If you'd like to control exactly where the big headline on the post page breaks onto a new line, add each line here, one box per line, in order -- no symbols or code needed. Example: three boxes reading \"I spent years\", \"intellectualizing\", \"my problems.\"",
                    },
                    {
                        type: "string", name: "endnoteTitle", label: "Closing note heading (optional -- skip this)",
                        description:
                            'Shown in a small box at the end of the post, e.g. "If you are in this stage". Leave both this and the note below blank to skip the closing note entirely -- the site builds and looks right either way.',
                    },
                    {
                        type: "string", name: "endnoteBody", label: "Closing note (optional -- skip this)", ui: { component: "textarea" },
                        description: "The text of the closing note. Only shows up if the heading above is also filled in.",
                    },
                ],
            },
        ],
    },
});
