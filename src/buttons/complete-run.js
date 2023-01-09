export default {
  data: { name: "complete-run" },
  async execute(interaction) {
    console.log("Button Clicked");
    await interaction.deferReply();
    await interaction.deleteReply();
  },
};
