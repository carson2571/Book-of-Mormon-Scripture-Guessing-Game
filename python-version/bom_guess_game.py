import sys, random, time


def extract_scriptures(scriptures_file):
    with open(scriptures_file) as file:
        return file.readlines()


def explain_rules():
    print()
    print("Welcome to the Book of Mormon Scripture Guessing Game created by Carson Hunter!\n")
    print("The goal of the game is to get as many points as possible.\n")
    print(
        "Ten different scriptures from the Book of Mormon will be presented and you have three guesses to guess what book and chapter each verse is from.\nWhen you enter guesses, you will first be asked for the book. Enter the book first, then you will be prompted for the chapter")
    print("However, each scripture will first be presented with only 1/3 of its words visible. \n")
    print(
        "If you can't guess the book and chapter correctly the first time, \nmore of the scripture will be revealed until the entire scripture is revealed for you to make your third and final guess for that verse.\n")
    print(
        "You will get partial points for guessing only the book from which the scripture comes but not the chapter.\nIf the correct book only has one chapter, like Enos or Words of Mormon, simply press enter when asked for the chapter number")
    print("Remember, you'll get more points if you guess the scripture on earlier guesses\n")
    print('Good luck, and may the Spirit "bring all things to your remembrance" ;)\n\n\n\n\n')
    time.sleep(5)


def get_scripture(scripture, percentage):
    third_script = []
    scripture = scripture.split()
    word_counter = 0
    for word in scripture:
        word_counter += 1
        decimal = random.random()
        if decimal < percentage and word_counter == 10:
            third_script.append(f'{"".join(['-' for ch in word])}\n')
            word_counter = 0
        elif decimal < percentage:
            third_script.append("".join(['-' for ch in word]))
        elif word_counter == 10:
            third_script.append(f'{word}\n')
            word_counter = 0
        else:
            third_script.append(word)
    return " ".join(third_script)


def indicate_correct_book(book, guess):
    if book == guess:
        return True
    else:
        return False


def guess_scripture(scripture, script_count, score, question_count):
    scripture = scripture.split('","')
    book = scripture[0].split(',')[0].strip().strip('"').strip()
    if len(scripture[0].split(',')) == 2:
        chapter = scripture[0].split(',')[1].strip().strip('"')
    else:
        chapter = ''
    reference = f"{book} {chapter}"
    verse = scripture[1].strip('"')
    time.sleep(2)
    print("\n\n\n")
    print(f'This is question #{question_count}!\n\nYour current score is {score}\n')
    time.sleep(2)

    third_script = get_scripture(verse, 0.66)
    print(third_script)
    print(
        "\nEnter the book and chapter from the Book of Mormon you think this verse is from: ")
    print()
    first_book_guess = input("Book: ").strip()
    while first_book_guess == '':
        first_book_guess = input("Please enter a book: ").strip()
    first_chapter_guess = input("Chapter: ").strip()
    while not first_chapter_guess.isdigit() and first_chapter_guess != '':
        first_chapter_guess = input("Please enter a number or empty string for a chapter: ").strip()
    print()
    if book.lower() == first_book_guess.lower() and chapter.lower() == first_chapter_guess.lower() or first_book_guess.lower() == reference.strip():
        print("You saucy monkey, you got it! You get 100 points!\n")
        return 100
    elif indicate_correct_book(book, first_book_guess):
        print("Eureka! You got the book right, but the chapter is not exactly right. Keep trying!")
        time.sleep(2)
    else:
        print("Not quite I'm afraid... try again with more of the words visible\n")
        time.sleep(2)
    two_third_script = get_scripture(verse, 0.33)
    print("\n\n\n")
    print(two_third_script)
    print(
        "\nEnter the book and chapter from the Book of Mormon you think this verse is from: ")
    print()
    second_book_guess = input("Book: ").strip()
    while second_book_guess == '':
        second_book_guess = input("Please enter a book: ").strip()
    second_chapter_guess = input("Chapter: ").strip()
    while not second_chapter_guess.isdigit() and second_chapter_guess != '':
        second_chapter_guess = input("Please enter a number or empty string for a chapter: ").strip()
    print()
    if second_book_guess.lower() == book.lower() and second_chapter_guess.lower() == chapter.lower() or second_book_guess.lower() == reference.strip():
        print("Bravo! A triumph for the ages! You get 75 points!\n")
        return 75
    elif indicate_correct_book(book, second_book_guess):
        print("Eureka! You got the book right, but the chapter is not exactly right. Keep trying!")
        time.sleep(2)
    else:
        print("Zoinks!! That's the wrooooong answer! One last try with the whole scripture visible!")
        time.sleep(2)
    full_script = get_scripture(verse, 0)
    print("\n\n\n")
    print(full_script)
    print(
        "\nEnter the book and chapter from the Book of Mormon you think this verse is from: ")
    print()
    third_book_guess = input("Book: ").strip()
    while third_book_guess == '':
        third_book_guess = input("Please enter a book: ").strip()
    third_chapter_guess = input("Chapter: ").strip()
    while not third_chapter_guess.isdigit() and third_chapter_guess != '':
        third_chapter_guess = input("Please enter a number or empty string for a chapter: ").strip()
    print()
    if third_book_guess.lower() == book.lower() and third_chapter_guess.lower() == chapter.lower() or third_book_guess.lower() == reference.strip():
        print("Rejoice! The struggle bears fruit! You get 50 points!\n")
        return 50
    elif indicate_correct_book(book, third_book_guess):
        print("Eureka! You got the book right, but not the chapter")
        time.sleep(2)
    print(f"Womp womp womp :( That is incorrect. The correct answer was {reference}. Better luck on the next question!\n")
    time.sleep(2)
    if first_book_guess.lower() == book.lower():
        print("\nAll is not lost, you get 30 bonus points for entering the correct book on your first guess!\n")
        return 30
    elif second_book_guess.lower() == book.lower():
        print("\nDon't fret, you get 20 bonus points for entering the correct book on your second guess!\n")
        return 20
    elif third_book_guess.lower() == book.lower():
        print("\nFear not! You get 10 bonus points for entering the correct book on your third guess!\n")
        return 10
    return 0


def add_to_scoreboard(name, score, scoreboard_file):
    lines_index = -1
    lines = get_scoreboard(scoreboard_file)
    new_line = f'{name}/{score}\n'
    for line in lines:
        lines_index += 1
        if name in line and int(score) > int(line.split('/')[1].strip()):
            lines[lines_index] = new_line
            with open(sys.argv[2], 'w') as file:
                file.writelines(lines)
            return
        elif name in line and int(score) <= int(line.split('/')[1].strip()):
            return

    with open(scoreboard_file, 'a') as file:
        file.write(f'{new_line}')


def get_scoreboard(scoreboard_file):
    with open(scoreboard_file) as file:
        return file.readlines()


def print_scoreboard(scoreboard):
    rank_count = 1
    print("Scoreboard")
    for line in scoreboard:
        line = line.split('/')
        print(f"{rank_count}. {line[0]}: {line[1].strip()}")
        rank_count += 1


def main():
    print(sys.argv)
    play_again = True
    while play_again:
        score = 0
        script_count = 0
        question_count = 1
        scriptures_list = extract_scriptures(sys.argv[1])
        ten_scriptures = random.sample(scriptures_list, 10)
        explain_rules()
        name = input("Please enter your name: ").strip()
        while script_count < 10:
            new_points = guess_scripture(ten_scriptures[script_count], script_count, score, question_count)
            script_count += 1
            question_count += 1
            score += new_points
        add_to_scoreboard(name, score, sys.argv[2])
        print(
            f"\n\n\nGreat job! Your final score is {score}. Here's where you rank on the scoreboard of all players!\n\n\n\n")
        scoreboard = get_scoreboard(sys.argv[2])
        scoreboard = sorted(scoreboard, key=lambda x: int(x.split('/')[1]), reverse=True)
        print_scoreboard(scoreboard)
        play_again = input(
            "\nThanks for playing! Enter 'again' to play again or any other character to end the program: ")
        print('\n\n\n\n\n\n\n')
        if play_again == 'again':
            play_again = True
        else:
            play_again = False


# TODO
# Finish adding scriptures


if __name__ == '__main__':
    main()
