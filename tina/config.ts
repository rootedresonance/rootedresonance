import { defineConfig } from "tinacms";

// Tina never touches HTML. It edits JSON in /content; the build regenerates pages.
// A bad edit can produce awkward wording. It cannot produce broken markup.
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
                                      type: "string", name: "slug", label: "Web address", required: true,
                                      description:
                                                      'The part after the slash, e.g. "why-rest-feels-unsafe" becomes rootedresonancetherapy.com/why-rest-feels-unsafe. Changing this on a live post breaks existing links, so once a post is published, leave it alone.',
                        },
                        {
                                      type: "string", name: "date", label: "Date (YYYY-MM-DD)", required: true,
                                      description: 'Example: 2026-09-18. Used to sort posts and build the web address of the sitemap entry.',
                        },
                        {
                                      type: "string", name: "dateLabel", label: "Date as written (optional)",
                                      description:
                                                      'How the date reads on the page, e.g. "September 18, 2026". Leave blank and it is generated automatically from the date above.',
                        },
                        {
                                      type: "string", name: "author", label: "Author (optional)",
                                      description: 'Leave blank and it defaults to "Annie Memmott, LPC".',
                        },
                        {
                                      type: "string", name: "stage", label: "Framework stage (optional)",
                                      options: ["Awaken", "Understand", "Reconnect", "Become", "Relate"],
                                      description: "Pick the stage this post relates to, if any. Leave unset if it doesn't fit one.",
                        },
                        {
                                      type: "string", name: "stageLabel", label: "Stage line (optional)",
                                      description:
                                                      'How the stage reads under the title, e.g. "Stage II - Understand". Leave blank and it is generated automatically from the stage you picked above.',
                        },
                        {
                                      type: "string", name: "readingTime", label: "Reading time (optional)",
                                      description: 'e.g. "4 min". Leave blank and it is estimated automatically from the length of the post.',
                        },
                        {
                                      type: "string", name: "excerpt", label: "Summary for the Journal list",
                                      ui: { component: "textarea" }, required: true,
                                      description:
                                                      "One or two sentences that show on the Journal page under the title. Also used as a fallback everywhere else a short description is needed.",
                        },
                        {
                                      type: "string", name: "metaDescription", label: "Search engine description (optional)",
                                      ui: { component: "textarea" },
                                      description:
                                                      "Around 155 characters. This is what shows up under the title in Google search results. Leave blank and the Summary above is used instead.",
                        },
                        {
                                      type: "string", name: "titleHtml", label: "Title with line breaks (optional)",
                                      description:
                                                      'Controls where the big headline wraps, using <br> between lines. Example: "I spent years<br>intellectualizing<br>my problems." Leave blank to just use the Title as one line.',
                        },
                        {
                                      type: "object", name: "content", label: "Post", list: true, required: true,
                                      description:
                                                      'Click "+ Post" below to add each part of your post, in order -- one block per paragraph, heading, or pull quote. Choose the kind of block from the dropdown; no symbols or formatting codes to remember. A short post might be: Paragraph, Paragraph, Heading, Paragraph, Pull Quote, Paragraph.',
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
                                      type: "string", name: "endnoteTitle", label: "Closing note heading (optional)",
                                      description:
                                                      'Shown in a small box at the end of the post, e.g. "If you are in this stage". Leave both this and the note below blank to skip the closing note entirely.',
                        },
                        {
                                      type: "string", name: "endnoteBody", label: "Closing note (optional)", ui: { component: "textarea" },
                                      description: "The text of the closing note. Only shows up if the heading above is also filled in.",
                        },
                                ],
            },
                ],
    },
});
