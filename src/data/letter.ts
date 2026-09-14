export type Block =
  | { type: "p"; text: string }
  | { type: "key"; text: string }
  | { type: "sign"; text: string };

const p = (text: string): Block => ({ type: "p", text });
const key = (text: string): Block => ({ type: "key", text });

export type Letter = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: Block[];
};

export const letter: Letter = {
  slug: "sunday-0",
  title: "Sunday 0",
  date: "September 13, 2026",
  summary:
    "A letter about family, the child we carry with us, and why Happy Lucky was never really just a name. An invitation to come and build it.",
  body: [
    p("Three years, twenty days and six months ago, I had a long and intense night. I still don't know exactly how to explain that night. I could try to describe what happened, but I don't think that is really the important part. What matters more to me is what came after. What it left me thinking about."),
    p("I started thinking about my family. About my brother. About my sisters. About Happy, Lucky, and Chacho. Happy is my older brother. Lucky is my younger sister. Chacho is my stepsister. Happy and Lucky are where the name of this project came from, but the more I thought about it, the more I realized that the name was never really just a name."),
    p("There are things we receive from the people we grow up with that we don't always recognize while we're receiving them. Love. Familiarity. A sense of belonging. Memories that become part of the way we remember ourselves. Someone to laugh with. Someone to argue with. Someone who knew you before you knew yourself. Someone who watched you become a person. And maybe that is one of the most valuable things family can give us: a reminder of who we were before we became so concerned with who we were supposed to become."),
    p("Because growing up does something to us. We become serious. We learn to work. We learn fear and in turn learn to worry and be scared of the world. We learn failure and pain, and we start to plan and expect from the world without truly knowing what it can give us. We learn to protect ourselves. We begin measuring our lives by things that can be measured: money, achievements, time, progress, expectations. And somewhere along the way, the child we once were can become very quiet."),
    key("But I don't think that child disappears. I think we carry them."),
    p("Maybe finding our inner child is partly about learning to hear them again. Not pretending that growing up didn't happen. Not trying to escape adulthood. But remembering the parts of ourselves that existed before everything had to have a purpose. The part that was curious simply because something was interesting. The part that wanted to make things just because making things felt good. The part that could disappear into music, a drawing, a game, a story, a film, or a strange idea. The part that could imagine an enormous future without immediately asking whether it was realistic. The part that could look at something ordinary and wonder what else it could be."),
    key("I think there is something important about finding that person again."),
    p("And the more I thought about that child inside me, the more I began thinking about children outside of me. Not children as an abstract cause. Not children as statistics. Not children as photographs on a fundraising page. Children. Real people. People who are already themselves, while still becoming themselves. People whose understanding of the world is still being formed. People who are learning what love feels like, what safety feels like, what possibility feels like, and what they should expect from the world around them."),
    p("That matters because childhood is not simply a waiting room for adulthood. It is a part of someone's life. It is where so many things begin. Curiosity begins there. Confidence can begin there. Creativity can begin there. Trust can begin there. The feeling that your voice matters can begin there. So can the opposite. A child can learn very early that they are not safe, that they are not important, that their ideas don't matter, or that the world has already decided what they are worth. And I don't think we should underestimate what that does to a person."),
    p("Children deserve to be safe. They deserve to be loved. They deserve food and education. They deserve to play. They deserve books and stories. They deserve to ask questions. They deserve to make mistakes without being made to feel that they themselves are mistakes. They deserve adults who listen to them. They deserve opportunities to discover what they are good at. They deserve the freedom to become someone we cannot yet imagine. And perhaps most importantly, they deserve to experience the feeling that their future belongs to them."),
    p("That is where Happy Lucky eventually led me. Because maybe caring about children is partly about remembering what it meant to be one. And maybe reconnecting with our own inner child gives us another way of understanding why childhood deserves to be protected. When we remember what it was like to be curious, imaginative, playful and full of possibility, we can begin to understand how precious those things are in someone who is still developing them."),
    key("A child is still becoming. And the people around them can either make that world larger or smaller. That is a responsibility."),
    p("But I also don't want to approach this project as though I already know exactly what children need. I don't. There are already people doing this work. There are children's charities. There are organizations. There are caregivers and teachers. There are communities that have been doing this for years. People who know much more about the realities children face than I do."),
    key("So perhaps the first thing we should do is listen."),
    p("Talk to existing children's organizations. Ask them what is actually needed. Ask what is working. Ask what isn't. Ask where the gaps are. Ask what people from outside can realistically contribute. Ask how we can help without arriving with the assumption that we know better."),
    p("I think that matters. Because if Happy Lucky is going to mean anything, I don't want it to be built around what I imagine from a distance. I want it to be built around listening to people who are already there."),
    key("And then we can begin."),
    p("The website needs to be finished, and then it needs to be shared. Not because a website changes a child's life by itself. It doesn't. But an idea needs somewhere to live. Somewhere people can find it. Somewhere they can understand what Happy Lucky is trying to become. Somewhere someone can read this and think, I want to be part of this."),
    p("Because I don't want Happy Lucky to belong only to me. It started with something personal. It came from my family. It carries the names of people who mean something to me. But I don't want it to end there. I want it to become something that other people can bring themselves into."),
    p("Someone might bring money. Someone might bring time. Someone might bring a skill. Someone might know a teacher. Someone might know a children's organization. Someone might have books. Someone might be able to teach. Someone might organize a bazaar. Someone might build something. Someone might know someone who can help. Someone might have an idea that I would never have thought of. Someone might simply care enough to show up."),
    key("All of those things matter."),
    p("A project like this doesn't have to begin as something enormous. It can begin with conversations. With listening. With a website. With one organization. With one person joining. With one child whose day becomes a little different because somebody decided to do something. And perhaps, over time, those small things can become something much bigger."),
    p("The long-term dream isn't simply to help a child through one difficult moment. It is bigger than that. I want Happy Lucky to eventually become something sustainable. A place. A community. An environment where children can grow, where they can learn, where they can play, where they can create, where they can discover themselves, where they can meet people who believe in them, and where they can imagine futures that are bigger than the circumstances they were born into."),
    p("I don't know exactly what that place will look like yet. Maybe it will change as we learn. Maybe the people who join will change it. Maybe the children themselves will change it. And maybe that's how it should be."),
    p("Three years, twenty days and six months ago, I didn't know that one intense night would eventually lead me here. I didn't know that it would make me think about my family in the way that it did. I didn't know that Happy and Lucky would eventually become part of the name of something I wanted to build. I didn't know that it would make me think about Chacho too. I didn't know that it would lead me back toward the child I once was. And I certainly didn't know that it would eventually make me think about children I haven't met."),
    key("But here we are."),
    key("Maybe that is what Happy Lucky is really about."),
    p("Remembering who we were. Remembering the people who helped shape us. Remembering what made us curious. Remembering what made us laugh. Remembering what made us want to make things. Remembering what made us feel alive. And then doing something with that memory."),
    p("Not just keeping it for ourselves. Protecting possibility where we can. Nurturing it where we can. Making room for it. Giving another child the chance to discover something in themselves that the world might otherwise have made difficult to find."),
    key("This is only Sunday One. The project is still becoming. And so am I."),
    p("I don't have every answer. I don't have the finished place. I don't have the perfect plan. But I have an idea that has stayed with me for years."),
    key("And I think it is finally time to stop keeping it to myself."),
    p("So this is an invitation. To listen. To think. To question. To contribute. To connect us with people already doing the work. To bring your skills, your ideas, your time, your resources, your relationships, or simply your willingness to help."),
    key("Come and build it with me."),
    key("Not for me."),
    key("With me."),
    { type: "sign", text: "Let's see what Happy Lucky can become." },
  ] as Block[],
};

export const letters: Letter[] = [letter];

export const readingMinutes = (l: Letter) =>
  Math.max(2, Math.round(l.body.map((b) => ("text" in b ? b.text : "")).join(" ").split(/\s+/).length / 180));
