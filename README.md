![Rubinyun: schedule and auto-publish to Instagram and Facebook](https://www.chrononyte.com/assets/img/og/rubinyun.png?v=2)

# n8n-nodes-rubinyun

An [n8n](https://n8n.io/) community node for [Rubinyun](https://www.chrononyte.com/projects/rubinyun/), the scheduler that publishes your posts to Instagram and Facebook at the time your audience is really online, read from your account's own data. The post goes out at the chosen time even with your computer off.

With this node you schedule, edit and list posts, read the best time to post, run the queue, read the results of a published post and check your balance, all from a workflow, without writing an HTTP call by hand.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Usage](#usage) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/). The package name is `n8n-nodes-rubinyun`.

On a self-hosted n8n: **Settings → Community Nodes → Install**, paste the package name, confirm.

## Operations

| Resource | Operation | What it does |
|---|---|---|
| Post | Create | Schedules a post: image, carousel (2 to 10 images), reel (one mp4 or mov) or story, with a caption and a date in the channel's own timezone |
| Post | Update | Changes the caption, the date or the media of a post that is still scheduled |
| Post | Delete | Removes a post from the queue |
| Post | Retry | Puts a failed post back in the queue |
| Post | Get Many | Lists the scheduled and published posts of the channel, one item per post |
| Channel | Get Many | Lists the channels of the account, with their ID and whether they are connected |
| Best Time | Get | The best time to post next, from the channel's own history. It steps around the posts already queued, so calling it in a loop gives you different times instead of stacking everything on the same minute |
| Queue | Run Now | Publishes right away the posts whose time has come, without waiting for the scheduler |
| Insight | Get | Likes, comments, reach and permalink of a published post, by post ID or by Instagram media ID |
| Account | Get | Checks the keys and reads the balance: free posts left, tokens, and the channel the keys act on |

Every operation has an optional **Channel ID**, for accounts with several profiles. You can also skip it and use a channel's own key pair in the credential: then every call acts on that channel.

## Credentials

1. Create a Rubinyun account and connect a profile: <https://www.chrononyte.com/rubinyun/register.php>. Connecting profiles is free.
2. In the console, under API keys, create a key. The **secret is shown once**.
3. In n8n, create a **Rubinyun API** credential with the key and the secret. The credential test calls the API and tells you whether the pair is accepted.

The node sends the two values as the `X-WS-Key` and `X-WS-Secret` headers.

## Usage

A minimal workflow: **Best Time → Post Create**. In Post Create, set `Scheduled At` to the expression `{{ $json.slot.at }}`: that is the value Best Time returns, already in the right form.

Media must be reachable by URL. If you only have a file, upload it first with an HTTP Request node to `https://www.chrononyte.com/rubinyun/upload.php` (multipart, field `image`, same two headers): the answer carries the `url` to use as Media URL. The [ready-made workflow](https://www.chrononyte.com/projects/rubinyun/docs.html#n8n) on the docs page has that node wired in, switched off.

When Rubinyun refuses a request, the node fails with the API's **stable code** in front of the message, for example `insufficient_tokens: insufficient tokens: 0 available, 2 already queued`. Branch on the code, not on the English text. With **Continue on Fail** the item carries the message in its `error` field instead of stopping the workflow.

A token is spent only when a post actually publishes. If the balance runs out between scheduling and publishing, the post turns `failed` with `out of tokens`, you get an email, and it goes out once you top up and run **Post → Retry** on it.

## Compatibility

Built and tested with n8n 1.x (`n8n-workflow` 2.x). Node.js 20 or later.

## Resources

* [Rubinyun API documentation](https://www.chrononyte.com/projects/rubinyun/docs.html)
* [Client examples in cURL, Python, Node and PHP](https://github.com/chrononyte/rubinyun-examples)
* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Version history

* **0.1.0**: first release. Post (create, update, delete, retry, get many), Channel, Best Time, Queue, Insight, Account.
