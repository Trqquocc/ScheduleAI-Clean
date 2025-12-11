def create_arr(n):
    arr = []
    for i in range(n):
        num = int(input(f'Nhập số thứ {i + 1}: '))
        arr.append(num)
    return arr

def view_arr(arr):
    for num in arr:
        print(f"{num}\t", end=' ')
    print()

def sum_arr(arr):
    return sum(arr)

def sum_odd(arr):
    return sum(x for x in arr if x % 2 != 0)

def sort_arr(arr):
    arr.sort()

def delete_at_index(arr, k):
    if 0 <= k < len(arr):
        del arr[k]
    else:
        print("Vị trí k không hợp lệ.")
    return arr

def insert_at_index(arr, k, x):
    if 0 <= k <= len(arr):
        arr.insert(k, x)
    else:
        print("Vị trí chèn không hợp lệ.")
    return arr

def input_positive_integer(prompt):
    while True:
        try:
            n = int(input(f"Nhập {prompt}: "))
            if n > 0:
                return n
            else:
                print("Phải nhập số nguyên dương.")
        except ValueError:
            print("Phải nhập số nguyên.")

def main():
    n = input_positive_integer("số lượng phần tử n")
    M = create_arr(n)

    print("\nMảng vừa nhập:")
    view_arr(M)

    s = sum_odd(M)
    print("Tổng các số lẻ trong mảng:", s)

    print("\nMảng sau khi sắp xếp tăng dần:")
    sort_arr(M)
    view_arr(M)

    k = input_positive_integer("vị trí cần xóa (bắt đầu từ 0)")
    M = delete_at_index(M, k)
    print("\nMảng sau khi xóa phần tử tại vị trí k:")
    view_arr(M)

    print("\nChèn số 100 vào vị trí 2:")
    M = insert_at_index(M, 2, 100)
    view_arr(M)

if __name__ == "__main__":
    main()
