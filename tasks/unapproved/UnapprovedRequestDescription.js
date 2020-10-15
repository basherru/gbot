const _ = require("lodash")
const timeUtils = require("../../utils/time")
const stringUtils = require("../../utils/strings")

class UnapprovedRequestDescription {
  constructor(request, config) {
    this.config = config
    this.request = request
  }

  build = () => {
    const updated = new Date(this.request.updated_at)
    const reaction = this.__getEmoji(updated)

    const link = `[${this.request.title}](${this.request.web_url})`
    const author = this.__authorString()
    const project = `[${this.request.project.name}](${this.request.project.web_url})`
    const unresolvedAuthors = this.__unresolvedAuthorsString()
    const approvedBy = this.__approvedByString()

    let message = [`${reaction} **${link}** (${project}) by **${author}**`]

    if (unresolvedAuthors.length > 0) {
      message.push(`unresolved threads by: ${unresolvedAuthors}`)
    }
    if (approvedBy.length > 0) {
      message.push(`already approved by: ${approvedBy}`)
    }

    return message.join("\n")
  }

  __getConfigSetting = (settingName, defaultValue = null) => {
    return _.get(this.config, settingName, defaultValue)
  }

  __getEmoji = lastUpdate => {
    const emoji = this.__getConfigSetting("unapproved.emoji", {})
    const interval = new Date().getTime() - lastUpdate.getTime()

    const findEmoji = _.flow(
      _.partialRight(_.toPairs),
      _.partialRight(_.map, ([key, value]) => [timeUtils.parseInterval(key), value]),
      _.partialRight(_.sortBy, ([time]) => -time),
      _.partialRight(_.find, ([time]) => time < interval),
      _.partialRight(_.last),
    )

    return findEmoji(emoji) || emoji.default || ""
  }

  __unresolvedAuthorsString = () => {
    return this.__unresolvedAuthorsFor(this.request).map(author => {
      return `@${author.username}`
    }).join(", ")
  }

  __approvedByString = () => {
    const tagApprovers = this.__getConfigSetting("unapproved.tag.approvers", false)

    return this.request.approved_by.map(approve => {
      const { user } = approve
      let message = `@${user.username}`

      if (!tagApprovers) {
        message = stringUtils.wrapString(message)
      }

      return message
    }).join(", ")
  }

  __authorString = () => {
    const tagAuthor = this.__getConfigSetting("unapproved.tag.author", false)
    let message = `@${this.request.author.username}`

    if (!tagAuthor) {
      message = stringUtils.wrapString(message)
    }
    return message
  }

  __unresolvedAuthorsFor = () => {
    const { discussions } = this.request

    const userNames = _.flow(
      _.partialRight(
        _.filter,
        discussion => discussion.notes.some(
          note => note.resolvable && !note.resolved
        )
      ),
      _.partialRight(
        _.map,
        discussion => discussion.notes.map(note => note.author)
      ),
      _.partialRight(_.flatten),
      _.partialRight(
        _.uniqBy,
        author => author.username
      ),
    )

    return userNames(discussions)
  }
}

module.exports = UnapprovedRequestDescription