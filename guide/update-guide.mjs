// Met à jour les pages du guide du module
main()

async function main() {
  const compendiumName = "coc2-base.coc2-guide-du-module"

  // Fait le lien entre un fichier html et l'id d'une page de journal
  const fileName_pageId = {
    introduction: "6iOtbHV23vUvHFoz",
    acteurs: "VLTB62ZkXZXNHCCP",
    objets: "ccIyTfB7UYkosg6i",
    actions_effets: "l9nCx6yP94pq9Ci6",
    jets_messages: "JqtWAmERoHxZhKn7",
    autres_fonctionnalites: "TAVDyMPTn4FPIvPP",
  }

  // Répertoire où se trouvent les fichiers html à partir du répertoire data
  const folderRef = "modules/coc2-base/guide/html/"
  const filesList = await foundry.applications.apps.FilePicker.implementation.browse("data", folderRef)
  console.log("Liste des fichiers", filesList)

  // Seulement les fichiers html
  const htmlFiles = filesList.files.filter((f) => f.includes(".html"))
  console.log("Liste des fichiers html", htmlFiles)

  for (let file of htmlFiles) {
    let filebase = file.replace(".html", "").replace(folderRef, "")
    let targetId = fileName_pageId[filebase]

    console.log("targetId", targetId)
    if (targetId) {
      for (let journal of game.packs.get(compendiumName)) {
        let journalpage = journal.pages.get(targetId)
        if (journalpage) {
          const fileData = await fetch(file)
          let filecontent = await fileData.text()
          journalpage.update({ "text.content": filecontent })
          console.log("Mise à jour réussie depuis le fichier :", file)
        }
      }
    }
  }
}
